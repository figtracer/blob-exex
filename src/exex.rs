use alloy_consensus::{BlockHeader, Transaction, transaction::SignerRecoverable};
use alloy_eips::{eip4844::DATA_GAS_PER_BLOB, eip7840::BlobParams};
use blob_exex::Database;
use futures::{Future, TryStreamExt};
use reth_execution_types::Chain;
use reth_exex::{ExExContext, ExExEvent, ExExNotification};
use reth_node_api::FullNodeComponents;
use reth_node_ethereum::EthereumNode;
use reth_primitives::EthPrimitives;
use reth_tracing::tracing::info;

async fn init<Node>(
    ctx: ExExContext<Node>,
    db: Database,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>>
where
    Node: FullNodeComponents<Types: reth::api::NodeTypes<Primitives = EthPrimitives>>,
{
    Ok(blob_exex(ctx, db))
}

/// Main ExEx logic
async fn blob_exex<Node>(mut ctx: ExExContext<Node>, db: Database) -> eyre::Result<()>
where
    Node: FullNodeComponents<Types: reth::api::NodeTypes<Primitives = EthPrimitives>>,
{
    while let Some(notification) = ctx.notifications.try_next().await? {
        match &notification {
            ExExNotification::ChainCommitted { new } => {
                process_chain(&db, new)?;
            }
            ExExNotification::ChainReorged { old, new } => {
                revert_chain(&db, old)?;
                process_chain(&db, new)?;
            }
            ExExNotification::ChainReverted { old } => {
                revert_chain(&db, old)?;
            }
        }

        if let Some(committed_chain) = notification.committed_chain() {
            ctx.events
                .send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
        }
    }
    Ok(())
}

fn process_chain(db: &Database, chain: &Chain) -> eyre::Result<()> {
    for block in chain.blocks_iter() {
        let block_number = block.header().number();
        let block_timestamp = block.header().timestamp();
        let mut blob_tx_count = 0u64;
        let mut total_blobs = 0u64;
        let mut blob_gas_used = 0u128;

        let blob_gas_price: i64 = block
            .header()
            .blob_fee(BlobParams::bpo2())
            .unwrap_or(0)
            .try_into()
            .unwrap_or(i64::MAX);

        let excess_blob_gas: i64 = block
            .header()
            .excess_blob_gas()
            .unwrap_or(0)
            .try_into()
            .unwrap_or(0);

        for tx in block.body().transactions() {
            if tx.tx_type() == 3 {
                blob_tx_count += 1;

                if let Some(blob_hashes) = tx.blob_versioned_hashes() {
                    let num_blobs = blob_hashes.len() as u64;
                    total_blobs += num_blobs;
                    blob_gas_used += (num_blobs as u128) * (DATA_GAS_PER_BLOB as u128);

                    if let Ok(sender) = tx.recover_signer() {
                        let tx_hash = tx.tx_hash().to_string();

                        // Insert blob transaction
                        db.insert_blob_transaction(
                            &tx_hash,
                            block_number,
                            &sender.to_string(),
                            num_blobs as i64,
                            blob_gas_price,
                            block_timestamp,
                        )?;

                        // Insert blob hashes
                        for (idx, blob_hash) in blob_hashes.iter().enumerate() {
                            db.insert_blob_hash(&tx_hash, &blob_hash.to_string(), idx as i64)?;
                        }

                        db.update_sender(&sender, num_blobs)?;
                    }
                }
            }
        }

        db.insert_block(
            block_number,
            block_timestamp,
            blob_tx_count,
            total_blobs,
            blob_gas_used as i64,
            blob_gas_price,
            excess_blob_gas,
        )?;

        info!(
            block = block_number,
            txs = blob_tx_count,
            blobs = total_blobs,
            "ExBlob"
        );
    }
    Ok(())
}

/// Revert blob stats for reorged blocks
fn revert_chain(db: &Database, chain: &Chain) -> eyre::Result<()> {
    for block in chain.blocks_iter() {
        db.delete_block(block.header().number())?;
    }
    info!(range = ?chain.range(), "Reverted blocks");
    Ok(())
}

fn main() -> eyre::Result<()> {
    reth::cli::Cli::parse_args().run(|builder, _| async move {
        let db_path = std::env::var("BLOB_DB_PATH").unwrap_or_else(|_| "blob_stats.db".to_string());
        let db = Database::new(&db_path)?;

        let handle = builder
            .node(EthereumNode::default())
            .install_exex("blob-exex", |ctx| init(ctx, db))
            .launch_with_debug_capabilities()
            .await?;

        handle.wait_for_node_exit().await
    })
}

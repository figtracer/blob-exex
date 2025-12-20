use alloy_consensus::{transaction::SignerRecoverable, BlockHeader, Transaction};
use alloy_eips::{eip4844::DATA_GAS_PER_BLOB, eip7840::BlobParams};
use alloy_primitives::Address;
use futures::{Future, TryStreamExt};
use reth_execution_types::Chain;
use reth_exex::{ExExContext, ExExEvent, ExExNotification};
use reth_node_api::FullNodeComponents;
use reth_node_ethereum::EthereumNode;
use reth_primitives::EthPrimitives;
use reth_tracing::tracing::info;
use rusqlite::Connection;

async fn init<Node>(
    ctx: ExExContext<Node>,
    db: Connection,
) -> eyre::Result<impl Future<Output = eyre::Result<()>>>
where
    Node: FullNodeComponents<Types: reth::api::NodeTypes<Primitives = EthPrimitives>>,
{
    create_tables(&db)?;
    Ok(blob_exex(ctx, db))
}

/// Main ExEx logic
async fn blob_exex<Node>(mut ctx: ExExContext<Node>, conn: Connection) -> eyre::Result<()>
where
    Node: FullNodeComponents<Types: reth::api::NodeTypes<Primitives = EthPrimitives>>,
{
    while let Some(notification) = ctx.notifications.try_next().await? {
        match &notification {
            ExExNotification::ChainCommitted { new } => {
                process_chain(&conn, new)?;
            }
            ExExNotification::ChainReorged { old, new } => {
                revert_chain(&conn, old)?;
                process_chain(&conn, new)?;
            }
            ExExNotification::ChainReverted { old } => {
                revert_chain(&conn, old)?;
            }
        }

        if let Some(committed_chain) = notification.committed_chain() {
            ctx.events
                .send(ExExEvent::FinishedHeight(committed_chain.tip().num_hash()))?;
        }
    }
    Ok(())
}

/// Create SQLite tables
fn create_tables(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS blocks (
            block_number INTEGER PRIMARY KEY,
            block_timestamp INTEGER NOT NULL,
            tx_count INTEGER NOT NULL,
            total_blobs INTEGER NOT NULL,
            gas_used INTEGER NOT NULL,
            gas_price INTEGER NOT NULL,
            excess_blob_gas INTEGER NOT NULL DEFAULT 0
        )
        "#,
        (),
    )?;

    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS senders (
            address TEXT PRIMARY KEY,
            tx_count INTEGER NOT NULL DEFAULT 0,
            total_blobs INTEGER NOT NULL DEFAULT 0
        )
        "#,
        (),
    )?;

    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS blob_transactions (
            tx_hash TEXT PRIMARY KEY,
            block_number INTEGER NOT NULL,
            sender TEXT NOT NULL,
            blob_count INTEGER NOT NULL,
            gas_price INTEGER NOT NULL,
            created_at INTEGER NOT NULL
        )
        "#,
        (),
    )?;

    conn.execute(
        r#"
        CREATE TABLE IF NOT EXISTS blob_hashes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT NOT NULL,
            blob_hash TEXT NOT NULL,
            blob_index INTEGER NOT NULL
        )
        "#,
        (),
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_blob_txs_block ON blob_transactions(block_number)",
        (),
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_blob_txs_sender ON blob_transactions(sender)",
        (),
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_blob_txs_created ON blob_transactions(created_at)",
        (),
    )?;

    info!("Database tables initialized");
    Ok(())
}

fn process_chain(db: &Connection, chain: &Chain) -> eyre::Result<()> {
    for block in chain.blocks_iter() {
        let block_number = block.header().number();
        let block_timestamp = block.header().timestamp();
        let mut blob_tx_count = 0u64;
        let mut total_blobs = 0u64;
        let mut blob_gas_used = 0u128;

        let blob_gas_price: i64 = block
            .header()
            .blob_fee(BlobParams::bpo1())
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
                        db.execute(
                            "INSERT OR REPLACE INTO blob_transactions VALUES (?, ?, ?, ?, ?, ?)",
                            (
                                &tx_hash,
                                block_number,
                                sender.to_string(),
                                num_blobs as i64,
                                blob_gas_price,
                                block_timestamp,
                            ),
                        )?;

                        // Insert blob hashes
                        for (idx, blob_hash) in blob_hashes.iter().enumerate() {
                            db.execute(
                                "INSERT INTO blob_hashes (tx_hash, blob_hash, blob_index) VALUES (?, ?, ?)",
                                (&tx_hash, blob_hash.to_string(), idx as i64),
                            )?;
                        }

                        update_sender(db, sender, num_blobs)?;
                    }
                }
            }
        }

        db.execute(
            "INSERT OR REPLACE INTO blocks VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                block_number,
                block_timestamp,
                blob_tx_count,
                total_blobs,
                blob_gas_used as i64,
                blob_gas_price,
                excess_blob_gas,
            ),
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

/// Update sender statistics
fn update_sender(db: &Connection, sender: Address, num_blobs: u64) -> rusqlite::Result<()> {
    db.execute(
        r#"
        INSERT INTO senders (address, tx_count, total_blobs)
        VALUES (?, 1, ?)
        ON CONFLICT(address) DO UPDATE SET
            tx_count = tx_count + 1,
            total_blobs = total_blobs + ?
        "#,
        (sender.to_string(), num_blobs, num_blobs),
    )?;
    Ok(())
}

/// Revert blob stats for reorged blocks
fn revert_chain(db: &Connection, chain: &Chain) -> eyre::Result<()> {
    for block in chain.blocks_iter() {
        db.execute(
            "DELETE FROM blocks WHERE block_number = ?",
            (block.header().number(),),
        )?;
    }
    info!(range = ?chain.range(), "Reverted blocks");
    Ok(())
}

fn main() -> eyre::Result<()> {
    reth::cli::Cli::parse_args().run(|builder, _| async move {
        let db_path = std::env::var("BLOB_DB_PATH").unwrap_or_else(|_| "blob_stats.db".to_string());
        let connection = Connection::open(&db_path)?;

        let handle = builder
            .node(EthereumNode::default())
            .install_exex("blob-exex", |ctx| init(ctx, connection))
            .launch_with_debug_capabilities()
            .await?;

        handle.wait_for_node_exit().await
    })
}

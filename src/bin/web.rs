use axum::{
    extract::{Query, State},
    http::header,
    response::{Html, IntoResponse},
    routing::get,
    Json, Router,
};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::Arc};
use tower_http::{cors::CorsLayer, services::ServeDir};

type DbPath = Arc<String>;

// Each blob is 128KB (131072 bytes) per EIP-4844
const BLOB_SIZE_BYTES: u64 = 131072;

#[derive(Serialize)]
struct Stats {
    total_blocks: u64,
    total_blobs: u64,
    total_transactions: u64,
    avg_blobs_per_block: f64,
    latest_block: Option<u64>,
    latest_gas_price: u64,
}

#[derive(Serialize)]
struct BlockTransaction {
    tx_hash: String,
    sender: String,
    blob_count: u64,
    blob_size: u64,
    chain: String,
}

#[derive(Serialize)]
struct Block {
    block_number: u64,
    block_timestamp: u64,
    tx_count: u64,
    total_blobs: u64,
    total_blob_size: u64,
    gas_used: u64,
    gas_price: u64,
    transactions: Vec<BlockTransaction>,
}

#[derive(Serialize)]
struct Sender {
    address: String,
    tx_count: u64,
    total_blobs: u64,
    total_blob_size: u64,
    chain: String,
}

#[derive(Serialize)]
struct ChartData {
    labels: Vec<u64>,
    blobs: Vec<u64>,
    gas_prices: Vec<f64>,
}

#[derive(Deserialize)]
struct ChartQuery {
    blocks: Option<u64>,
}

#[derive(Serialize)]
struct BlobTransaction {
    tx_hash: String,
    block_number: u64,
    sender: String,
    blob_count: u64,
    blob_size: u64,
    gas_price: u64,
    chain: String,
    blob_hashes: Vec<String>,
}

#[derive(Serialize)]
struct ChainStats {
    chain: String,
    tx_count: u64,
    blob_count: u64,
    percentage: f64,
}

#[derive(Deserialize)]
struct TimeRangeQuery {
    hours: Option<u64>,
}

#[derive(Deserialize)]
struct BlockQuery {
    block_number: u64,
}

// Known L2 sequencer/batcher addresses
fn identify_chain(address: &str) -> String {
    let addr = address.to_lowercase();

    match addr.as_str() {
        // Base
        "0x5050f69a9786f081509234f1a7f4684b5e5b76c9" => "Base".to_string(),
        "0xff00000000000000000000000000000000008453" => "Base".to_string(),

        // Optimism
        "0x6887246668a3b87f54deb3b94ba47a6f63f32985" => "Optimism".to_string(),

        // Arbitrum
        "0xc1b634853cb333d3ad8663715b08f41a3aec47cc" => "Arbitrum".to_string(),
        "0xa4b10ac61e79ea1e150df70b8dda53391928fd14" => "Arbitrum".to_string(),
        "0xa4b1e63cb4901e327597bc35d36fe8a23e4c253f" => "Arbitrum".to_string(),

        // Scroll
        "0xa1e4380a3b1f749673e270229993ee55f35663b4" => "Scroll".to_string(),
        "0xcf2898225ed05be911d3709d9417e86e0b4cfc8f" => "Scroll".to_string(),
        "0x4f250b05262240c787a1ee222687c6ec395c628a" => "Scroll".to_string(),
        "0xb4a04505a487fcf16232d74ebb76429e232b1f21" => "Scroll".to_string(),
        "0x054a47b9e2a22af6c0ce55020238c8fecd7d334b" => "Scroll".to_string(),

        // Starknet
        "0x415c8893d514f9bc5211d36eeda4183226b84aa7" => "Starknet".to_string(),
        "0x2c169dfe5fbba12957bdd0ba47d9cedbfe260ca7" => "Starknet".to_string(),

        // zkSync Era
        "0xa9268341831efa4937537bc3e9eb36dbece83c7e" => "zkSync Era".to_string(),
        "0x3dB52cE065f728011Ac6732222270b3F2360d919" => "zkSync Era".to_string(),

        // Linea
        "0xd19d4b5d358258f05d7b411e21a1460d11b0876f" => "Linea".to_string(),
        "0xc70ae19b5feaa5c19f576e621d2bad9771864fe2" => "Linea".to_string(),

        // Taiko
        "0x77b064f418b27167bd8c6f263a16455e628b56cb" => "Taiko".to_string(),
        "0xfc3756dc89ee98b049c1f2b0c8e69f0649e5c3e3" => "Taiko".to_string(),

        // Abstract
        "0x4b2d036d2c27192549ad5a2f2d9875e1843833de" => "Abstract".to_string(),

        // World
        "0xdbbe3d8c2d2b22a2611c5a94a9a12c2fcd49eb29" => "World".to_string(),

        // Ink
        "0x500d7ea63cf2e501dadaa5feec1fc19fe2aa72ac" => "Ink".to_string(),

        // Blast
        "0x98a986ee08bf67c9cfc4de2aaaff2d7f56c0bc47" => "Blast".to_string(),

        // Zora
        "0x625726c858dbf78c0125436c943bf4b4be9d9033" => "Zora".to_string(),

        // Mode
        "0x99199a22125034c808ff20f377d91187e8050f2e" => "Mode".to_string(),

        // Mantle
        "0xd1328c9167e0693b689b5aa5a024379d4e437858" => "Mantle".to_string(),

        // Metal
        "0xc94c243f8fb37223f3eb77f1e6d55e0f8f9caef4" => "Metal".to_string(),
        "0xc94c243f8fb37223f3eb2f7961f7072602a51b8b" => "Metal".to_string(),

        // Cyber
        "0x3c11c3025ce387d76c2eddf1493ec55a8cc2a0f7" => "Cyber".to_string(),

        // Kroma
        "0x41b8cd6791de4d8f9e0eda9f185ce1898f0b5b3b" => "Kroma".to_string(),

        // Redstone
        "0xa8cd7f4c94eb0f15a5d8f5e9f9b4eb9b2e3eb60d" => "Redstone".to_string(),

        // Fraxtal
        "0x7f9d9c1bce1062e1077845ea39a0303429600a06" => "Fraxtal".to_string(),

        // Mint
        "0xd6c24e78cc77e48c87c246a2e0b7d21ffb7c1c0a" => "Mint".to_string(),

        // Soneium
        "0x6776be80dbada6a02b5f2095cf13734ac303b8d1" => "Soneium".to_string(),

        // Lighter
        "0xfbc0dcd6c3518cb529bc1b585db992a7d40005fa" => "Lighter".to_string(),

        // UniChain
        "0x2f60a5184c63ca94f82a27100643dbabe4f3f7fd" => "UniChain".to_string(),

        // Katana
        "0x1ffda89c755f6d4af069897d77ccabb580fd412a" => "Katana".to_string(),

        // Codex
        "0xb5bd290ef8ef3840cb866c7a8b7cc9e45fde3ab9" => "Codex".to_string(),

        _ => "Other".to_string(),
    }
}

fn open_db(path: &str) -> Result<Connection, rusqlite::Error> {
    let conn = Connection::open(path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    Ok(conn)
}

async fn get_stats(State(db_path): State<DbPath>) -> Json<Stats> {
    let conn = open_db(&db_path).expect("Failed to open database");

    let total_blocks: u64 = conn
        .query_row("SELECT COUNT(*) FROM blocks", [], |row| row.get(0))
        .unwrap_or(0);

    let total_blobs: u64 = conn
        .query_row(
            "SELECT COALESCE(SUM(total_blobs), 0) FROM blocks",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let total_transactions: u64 = conn
        .query_row("SELECT COALESCE(SUM(tx_count), 0) FROM blocks", [], |row| {
            row.get(0)
        })
        .unwrap_or(0);

    let latest_block: Option<u64> = conn
        .query_row("SELECT MAX(block_number) FROM blocks", [], |row| row.get(0))
        .ok();

    let latest_gas_price: u64 = conn
        .query_row(
            "SELECT gas_price FROM blocks ORDER BY block_number DESC LIMIT 1",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    let avg_blobs_per_block = if total_blocks > 0 {
        total_blobs as f64 / total_blocks as f64
    } else {
        0.0
    };

    Json(Stats {
        total_blocks,
        total_blobs,
        total_transactions,
        avg_blobs_per_block,
        latest_block,
        latest_gas_price,
    })
}

async fn get_recent_blocks(State(db_path): State<DbPath>) -> Json<Vec<Block>> {
    let conn = open_db(&db_path).expect("Failed to open database");

    let mut stmt = conn
        .prepare(
            "SELECT block_number, block_timestamp, tx_count, total_blobs, gas_used, gas_price
             FROM blocks ORDER BY block_number DESC LIMIT 50",
        )
        .unwrap();

    let block_data: Vec<(u64, u64, u64, u64, u64, u64)> = stmt
        .query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
            ))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    let blocks: Vec<Block> = block_data
        .into_iter()
        .map(|(block_number, block_timestamp, tx_count, total_blobs, gas_used, gas_price)| {
            // Fetch transactions for this block
            let mut tx_stmt = conn
                .prepare(
                    "SELECT tx_hash, sender, blob_count FROM blob_transactions WHERE block_number = ?",
                )
                .unwrap();

            let transactions: Vec<BlockTransaction> = tx_stmt
                .query_map([block_number], |row| {
                    let sender: String = row.get(1)?;
                    let blob_count: u64 = row.get(2)?;
                    Ok((row.get::<_, String>(0)?, sender, blob_count))
                })
                .unwrap()
                .filter_map(|r| r.ok())
                .map(|(tx_hash, sender, blob_count)| {
                    let chain = identify_chain(&sender);
                    BlockTransaction {
                        tx_hash,
                        sender,
                        blob_count,
                        blob_size: blob_count * BLOB_SIZE_BYTES,
                        chain,
                    }
                })
                .collect();

            Block {
                block_number,
                block_timestamp,
                tx_count,
                total_blobs,
                total_blob_size: total_blobs * BLOB_SIZE_BYTES,
                gas_used,
                gas_price,
                transactions,
            }
        })
        .collect();

    Json(blocks)
}

async fn get_top_senders(State(db_path): State<DbPath>) -> Json<Vec<Sender>> {
    let conn = open_db(&db_path).expect("Failed to open database");

    let mut stmt = conn
        .prepare(
            "SELECT address, tx_count, total_blobs
             FROM senders ORDER BY total_blobs DESC LIMIT 20",
        )
        .unwrap();

    let senders: Vec<Sender> = stmt
        .query_map([], |row| {
            let address: String = row.get(0)?;
            let tx_count: u64 = row.get(1)?;
            let total_blobs: u64 = row.get(2)?;
            Ok((address, tx_count, total_blobs))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .map(|(address, tx_count, total_blobs)| {
            let chain = identify_chain(&address);
            let total_blob_size = total_blobs * BLOB_SIZE_BYTES;
            Sender {
                address,
                tx_count,
                total_blobs,
                total_blob_size,
                chain,
            }
        })
        .collect();

    Json(senders)
}

async fn get_chart_data(
    State(db_path): State<DbPath>,
    Query(params): Query<ChartQuery>,
) -> Json<ChartData> {
    let conn = open_db(&db_path).expect("Failed to open database");

    // Get the last N blocks (default 100)
    let num_blocks = params.blocks.unwrap_or(100);

    // First, get the latest block number
    let latest_block: u64 = conn
        .query_row("SELECT MAX(block_number) FROM blocks", [], |row| row.get(0))
        .unwrap_or(0);

    if latest_block == 0 {
        return Json(ChartData {
            labels: Vec::new(),
            blobs: Vec::new(),
            gas_prices: Vec::new(),
        });
    }

    let start_block = latest_block.saturating_sub(num_blocks - 1);

    // Query all blocks in range from the blocks table (these all have blob data)
    let mut stmt = conn
        .prepare(
            "SELECT block_number, total_blobs, gas_price
             FROM blocks
             WHERE block_number >= ? AND block_number <= ?
             ORDER BY block_number ASC",
        )
        .unwrap();

    // Build a map of block_number -> (blobs, gas_price)
    let mut block_data: std::collections::HashMap<u64, (u64, u64)> =
        std::collections::HashMap::new();
    let mut last_gas_price: u64 = 0;

    let rows = stmt
        .query_map([start_block, latest_block], |row| {
            Ok((
                row.get::<_, u64>(0)?,
                row.get::<_, u64>(1)?,
                row.get::<_, u64>(2)?,
            ))
        })
        .unwrap();

    for row in rows.flatten() {
        block_data.insert(row.0, (row.1, row.2));
        last_gas_price = row.2;
    }

    // Generate data for every block in range
    let mut labels = Vec::with_capacity(num_blocks as usize);
    let mut blobs = Vec::with_capacity(num_blocks as usize);
    let mut gas_prices = Vec::with_capacity(num_blocks as usize);

    for block_num in start_block..=latest_block {
        labels.push(block_num);
        if let Some((blob_count, gas_price)) = block_data.get(&block_num) {
            blobs.push(*blob_count);
            gas_prices.push(*gas_price as f64 / 1e9);
            last_gas_price = *gas_price;
        } else {
            // Block without blob transactions - show 0 blobs, use last known gas price
            blobs.push(0);
            gas_prices.push(last_gas_price as f64 / 1e9);
        }
    }

    Json(ChartData {
        labels,
        blobs,
        gas_prices,
    })
}

async fn get_blob_transactions(State(db_path): State<DbPath>) -> Json<Vec<BlobTransaction>> {
    let conn = open_db(&db_path).expect("Failed to open database");

    let mut stmt = conn
        .prepare(
            "SELECT tx_hash, block_number, sender, blob_count, gas_price
             FROM blob_transactions
             ORDER BY created_at DESC
             LIMIT 50",
        )
        .unwrap();

    let txs: Vec<BlobTransaction> = stmt
        .query_map([], |row| {
            let tx_hash: String = row.get(0)?;
            let sender: String = row.get(2)?;

            Ok((
                tx_hash.clone(),
                row.get::<_, u64>(1)?,
                sender.clone(),
                row.get::<_, u64>(3)?,
                row.get::<_, u64>(4)?,
            ))
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .map(|(tx_hash, block_number, sender, blob_count, gas_price)| {
            // Get blob hashes for this transaction
            let mut blob_stmt = conn
                .prepare("SELECT blob_hash FROM blob_hashes WHERE tx_hash = ? ORDER BY blob_index")
                .unwrap();

            let blob_hashes: Vec<String> = blob_stmt
                .query_map([&tx_hash], |row| row.get(0))
                .unwrap()
                .filter_map(|r| r.ok())
                .collect();

            let chain = identify_chain(&sender);
            let blob_size = blob_count * BLOB_SIZE_BYTES;

            BlobTransaction {
                tx_hash,
                block_number,
                sender,
                blob_count,
                blob_size,
                gas_price,
                chain,
                blob_hashes,
            }
        })
        .collect();

    Json(txs)
}

async fn get_chain_stats(
    State(db_path): State<DbPath>,
    Query(params): Query<TimeRangeQuery>,
) -> Json<Vec<ChainStats>> {
    let conn = open_db(&db_path).expect("Failed to open database");

    let hours = params.hours.unwrap_or(24);
    let time_limit = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
        - (hours as i64 * 3600);

    let mut stmt = conn
        .prepare(
            "SELECT sender, COUNT(*) as tx_count, SUM(blob_count) as blob_count
             FROM blob_transactions
             WHERE created_at >= ?
             GROUP BY sender
             ORDER BY blob_count DESC",
        )
        .unwrap();

    let mut chain_map: HashMap<String, (u64, u64)> = HashMap::new();
    let mut total_blobs = 0u64;

    let rows = stmt
        .query_map([time_limit], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, u64>(1)?,
                row.get::<_, u64>(2)?,
            ))
        })
        .unwrap();

    for row in rows.flatten() {
        let chain = identify_chain(&row.0);
        let entry = chain_map.entry(chain).or_insert((0, 0));
        entry.0 += row.1; // tx_count
        entry.1 += row.2; // blob_count
        total_blobs += row.2;
    }

    let mut stats: Vec<ChainStats> = chain_map
        .into_iter()
        .map(|(chain, (tx_count, blob_count))| {
            let percentage = if total_blobs > 0 {
                (blob_count as f64 / total_blobs as f64) * 100.0
            } else {
                0.0
            };
            ChainStats {
                chain,
                tx_count,
                blob_count,
                percentage,
            }
        })
        .collect();

    stats.sort_by(|a, b| b.blob_count.cmp(&a.blob_count));

    Json(stats)
}

async fn get_block(
    State(db_path): State<DbPath>,
    Query(params): Query<BlockQuery>,
) -> Json<Option<Block>> {
    let conn = open_db(&db_path).expect("Failed to open database");
    let block_number = params.block_number;

    // Check if block exists
    let block_exists: Option<(u64, u64, u64, u64, u64)> = conn
        .query_row(
            "SELECT block_timestamp, tx_count, total_blobs, gas_used, gas_price
             FROM blocks WHERE block_number = ?",
            [block_number],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                ))
            },
        )
        .ok();

    if let Some((block_timestamp, tx_count, total_blobs, gas_used, gas_price)) = block_exists {
        // Fetch transactions for this block
        let mut tx_stmt = conn
            .prepare(
                "SELECT tx_hash, sender, blob_count FROM blob_transactions WHERE block_number = ?",
            )
            .unwrap();

        let transactions: Vec<BlockTransaction> = tx_stmt
            .query_map([block_number], |row| {
                let sender: String = row.get(1)?;
                let blob_count: u64 = row.get(2)?;
                Ok((row.get::<_, String>(0)?, sender, blob_count))
            })
            .unwrap()
            .filter_map(|r| r.ok())
            .map(|(tx_hash, sender, blob_count)| {
                let chain = identify_chain(&sender);
                BlockTransaction {
                    tx_hash,
                    sender,
                    blob_count,
                    blob_size: blob_count * BLOB_SIZE_BYTES,
                    chain,
                }
            })
            .collect();

        Json(Some(Block {
            block_number,
            block_timestamp,
            tx_count,
            total_blobs,
            total_blob_size: total_blobs * BLOB_SIZE_BYTES,
            gas_used,
            gas_price,
            transactions,
        }))
    } else {
        Json(None)
    }
}

async fn index() -> impl IntoResponse {
    (
        [(header::CONTENT_TYPE, "text/html")],
        Html(include_str!("../../static/index.html")),
    )
}

#[tokio::main]
async fn main() -> eyre::Result<()> {
    let db_path = std::env::var("BLOB_DB_PATH").unwrap_or_else(|_| "blob_stats.db".to_string());

    // Verify DB is accessible
    let _ = open_db(&db_path)?;

    let db_path: DbPath = Arc::new(db_path);

    let static_dir = std::env::var("BLOB_STATIC_DIR").unwrap_or_else(|_| "static".to_string());

    let app = Router::new()
        .route("/", get(index))
        .route("/api/stats", get(get_stats))
        .route("/api/blocks", get(get_recent_blocks))
        .route("/api/block", get(get_block))
        .route("/api/senders", get(get_top_senders))
        .route("/api/chart", get(get_chart_data))
        .route("/api/blob-transactions", get(get_blob_transactions))
        .route("/api/chain-stats", get(get_chain_stats))
        .nest_service("/css", ServeDir::new(format!("{}/css", static_dir)))
        .nest_service("/js", ServeDir::new(format!("{}/js", static_dir)))
        .layer(CorsLayer::permissive())
        .with_state(db_path);

    let addr = std::env::var("BLOB_WEB_ADDR").unwrap_or_else(|_| "0.0.0.0:3000".to_string());
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    println!("ExBlob running at http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

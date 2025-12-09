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
use tower_http::cors::CorsLayer;

type DbPath = Arc<String>;

#[derive(Serialize)]
struct Stats {
    total_blocks: u64,
    total_blobs: u64,
    total_transactions: u64,
    avg_blobs_per_block: f64,
    latest_block: Option<u64>,
    avg_gas_price: f64,
}

#[derive(Serialize)]
struct Block {
    block_number: u64,
    tx_count: u64,
    total_blobs: u64,
    gas_used: u64,
    gas_price: u64,
}

#[derive(Serialize)]
struct Sender {
    address: String,
    tx_count: u64,
    total_blobs: u64,
}

#[derive(Serialize)]
struct ChartData {
    labels: Vec<u64>,
    blobs: Vec<u64>,
    gas_prices: Vec<f64>,
}

#[derive(Serialize)]
struct BlobTransaction {
    tx_hash: String,
    block_number: u64,
    sender: String,
    blob_count: u64,
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

// Known L2 sequencer addresses
fn identify_chain(address: &str) -> String {
    let addr = address.to_lowercase();

    // Major L2 sequencer addresses (you can expand this list)
    if addr == "0x5050f69a9786f081509234f1a7f4684b5e5b76c9" {
        "Base".to_string()
    } else if addr == "0x6887246668a3b87f54deb3b94ba47a6f63f32985" {
        "Optimism".to_string()
    } else if addr == "0xc1b634853cb333d3ad8663715b08f41a3aec47cc" {
        "Arbitrum".to_string()
    } else if addr == "0xa1e4380a3b1f749673e270229993ee55f35663b4" {
        "Scroll".to_string()
    } else if addr == "0x415c8893d514f9bc5211d36eeda4183226b84aa7" {
        "Starknet".to_string()
    } else if addr == "0xa9268341831efa4937537bc3e9eb36dbece83c7e" {
        "zkSync Era".to_string()
    } else if addr == "0xff00000000000000000000000000000000008453" {
        "Base (Alt)".to_string()
    } else if addr == "0x6887246668a3b87f54deb3b94ba47a6f63f32985" {
        "OP Mainnet".to_string()
    } else {
        "Other".to_string()
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

    let avg_gas_price: f64 = conn
        .query_row(
            "SELECT COALESCE(AVG(gas_price), 0) FROM blocks",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0.0);

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
        avg_gas_price,
    })
}

async fn get_recent_blocks(State(db_path): State<DbPath>) -> Json<Vec<Block>> {
    let conn = open_db(&db_path).expect("Failed to open database");

    let mut stmt = conn
        .prepare(
            "SELECT block_number, tx_count, total_blobs, gas_used, gas_price
             FROM blocks ORDER BY block_number DESC LIMIT 50",
        )
        .unwrap();

    let blocks: Vec<Block> = stmt
        .query_map([], |row| {
            Ok(Block {
                block_number: row.get(0)?,
                tx_count: row.get(1)?,
                total_blobs: row.get(2)?,
                gas_used: row.get(3)?,
                gas_price: row.get(4)?,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
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
            Ok(Sender {
                address: row.get(0)?,
                tx_count: row.get(1)?,
                total_blobs: row.get(2)?,
            })
        })
        .unwrap()
        .filter_map(|r| r.ok())
        .collect();

    Json(senders)
}

async fn get_chart_data(
    State(db_path): State<DbPath>,
    Query(params): Query<TimeRangeQuery>,
) -> Json<ChartData> {
    let conn = open_db(&db_path).expect("Failed to open database");

    let hours = params.hours.unwrap_or(1);
    let time_limit = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
        - (hours as i64 * 3600);

    let mut stmt = conn
        .prepare(
            "SELECT block_number, total_blobs, gas_price
             FROM blocks
             WHERE block_timestamp >= ?
             ORDER BY block_number ASC",
        )
        .unwrap();

    let mut labels = Vec::new();
    let mut blobs = Vec::new();
    let mut gas_prices = Vec::new();

    let rows = stmt
        .query_map([time_limit], |row| {
            Ok((
                row.get::<_, u64>(0)?,
                row.get::<_, u64>(1)?,
                row.get::<_, u64>(2)?,
            ))
        })
        .unwrap();

    for row in rows.flatten() {
        labels.push(row.0);
        blobs.push(row.1);
        gas_prices.push(row.2 as f64 / 1e9);
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

            BlobTransaction {
                tx_hash,
                block_number,
                sender,
                blob_count,
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

    let app = Router::new()
        .route("/", get(index))
        .route("/api/stats", get(get_stats))
        .route("/api/blocks", get(get_recent_blocks))
        .route("/api/senders", get(get_top_senders))
        .route("/api/chart", get(get_chart_data))
        .route("/api/blob-transactions", get(get_blob_transactions))
        .route("/api/chain-stats", get(get_chain_stats))
        .layer(CorsLayer::permissive())
        .with_state(db_path);

    let addr = std::env::var("BLOB_WEB_ADDR").unwrap_or_else(|_| "0.0.0.0:3000".to_string());
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    println!("ExBlob running at http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

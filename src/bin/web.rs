use axum::{
    extract::State,
    http::header,
    response::{Html, IntoResponse},
    routing::get,
    Json, Router,
};
use rusqlite::Connection;
use serde::Serialize;
use std::sync::Arc;
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

async fn get_chart_data(State(db_path): State<DbPath>) -> Json<ChartData> {
    let conn = open_db(&db_path).expect("Failed to open database");

    let mut stmt = conn
        .prepare(
            "SELECT block_number, total_blobs, gas_price
             FROM blocks ORDER BY block_number DESC LIMIT 100",
        )
        .unwrap();

    let mut labels = Vec::new();
    let mut blobs = Vec::new();
    let mut gas_prices = Vec::new();

    let rows = stmt
        .query_map([], |row| {
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

    labels.reverse();
    blobs.reverse();
    gas_prices.reverse();

    Json(ChartData {
        labels,
        blobs,
        gas_prices,
    })
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
        .layer(CorsLayer::permissive())
        .with_state(db_path);

    let addr = std::env::var("BLOB_WEB_ADDR").unwrap_or_else(|_| "0.0.0.0:3000".to_string());
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    println!("ExBlob running at http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

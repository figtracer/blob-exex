use axum::{
    Json, Router,
    extract::{Query, State},
    http::header,
    response::{Html, IntoResponse},
    routing::get,
};
use blob_exex::Database;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;
use tower_http::{cors::CorsLayer, services::ServeDir};

// Cache entry with data and timestamp
struct CacheEntry<T> {
    data: T,
    cached_at: Instant,
}

impl<T: Clone> CacheEntry<T> {
    fn new(data: T) -> Self {
        Self {
            data,
            cached_at: Instant::now(),
        }
    }

    fn is_valid(&self, ttl: Duration) -> bool {
        self.cached_at.elapsed() < ttl
    }
}

// Application cache for expensive queries
struct AppCache {
    stats: RwLock<Option<CacheEntry<Stats>>>,
    blocks: RwLock<Option<CacheEntry<Vec<Block>>>>,
    senders: RwLock<Option<CacheEntry<Vec<Sender>>>>,
    blob_transactions: RwLock<Option<CacheEntry<Vec<BlobTransaction>>>>,
    all_time_chart: RwLock<Option<CacheEntry<AllTimeChartData>>>,
    chain_profiles: RwLock<Option<CacheEntry<Vec<ChainProfile>>>>,
    chain_profiles_all_time: RwLock<Option<CacheEntry<Vec<ChainProfile>>>>,
}

impl AppCache {
    fn new() -> Self {
        Self {
            stats: RwLock::new(None),
            blocks: RwLock::new(None),
            senders: RwLock::new(None),
            blob_transactions: RwLock::new(None),
            all_time_chart: RwLock::new(None),
            chain_profiles: RwLock::new(None),
            chain_profiles_all_time: RwLock::new(None),
        }
    }
}

// Cache TTLs
const STATS_TTL: Duration = Duration::from_secs(30);
const BLOCKS_TTL: Duration = Duration::from_secs(30);
const SENDERS_TTL: Duration = Duration::from_secs(60);
const BLOB_TXS_TTL: Duration = Duration::from_secs(30);
const ALL_TIME_CHART_TTL: Duration = Duration::from_secs(300); // 5 minutes
const CHAIN_PROFILES_TTL: Duration = Duration::from_secs(60);
const CHAIN_PROFILES_ALL_TIME_TTL: Duration = Duration::from_secs(300); // 5 minutes

// Application state containing both database and cache
#[derive(Clone)]
struct AppState {
    db: Database,
    cache: Arc<AppCache>,
}

// Each blob is 128KB (131072 bytes) per EIP-4844
const BLOB_SIZE_BYTES: u64 = 131072;

// Protocol constants (BPO1 - update these for BPO2)
const BLOB_TARGET: u64 = 10;
const BLOB_MAX: u64 = 15;

#[derive(Serialize, Clone)]
struct Stats {
    total_blocks: u64,
    total_blobs: u64,
    total_transactions: u64,
    avg_blobs_per_block: f64,
    latest_block: Option<u64>,
    earliest_block: Option<u64>,
    latest_gas_price: u64,
}

#[derive(Serialize, Clone)]
struct BlockTransaction {
    tx_hash: String,
    sender: String,
    blob_count: u64,
    blob_size: u64,
    chain: String,
}

#[derive(Serialize, Clone)]
struct Block {
    block_number: u64,
    block_timestamp: u64,
    tx_count: u64,
    total_blobs: u64,
    total_blob_size: u64,
    gas_used: u64,
    gas_price: u64,
    excess_blob_gas: u64,
    transactions: Vec<BlockTransaction>,
    // Derived metrics
    target_utilization: f64,
    saturation_index: f64,
}

#[derive(Serialize, Clone)]
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

#[derive(Serialize, Clone)]
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

#[derive(Deserialize)]
struct TimeRangeQuery {
    hours: Option<u64>,
}

#[derive(Deserialize)]
struct BlockQuery {
    block_number: u64,
}

// BPO2 activation timestamp (January 6, 2026)
const BPO2_TIMESTAMP: u64 = 1767747671;

#[derive(Serialize, Clone)]
struct AllTimeChartData {
    labels: Vec<u64>,        // Block numbers (sampled)
    blobs: Vec<f64>,         // Smoothed blob counts
    gas_prices: Vec<f64>,    // Smoothed gas prices in Gwei
    timestamps: Vec<u64>,    // Block timestamps
    targets: Vec<u64>,       // Dynamic target at each point
    maxes: Vec<u64>,         // Dynamic max at each point
    bpo2_block: Option<u64>, // First block after BPO2 activation
}

// Chain behavior profile (also serves as chain stats)
#[derive(Serialize, Clone)]
struct ChainProfile {
    chain: String,
    total_transactions: u64,
    total_blobs: u64,
    percentage: f64, // % of total blobs in time window
    avg_blobs_per_tx: f64,
    avg_posting_interval_secs: f64, // Average time between posts
    hourly_activity: Vec<f64>,      // 24 hours, normalized 0-1
}

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

        // Swell Chain
        "0xeb18ea5dedee42e7af378991dfeb719d21c17b4c" => "Swell Chain".to_string(),

        // Zircuit
        "0xaf1e4f6a47af647f87c0ec814d8032c4a4bff145" => "Zircuit".to_string(),

        // zkSync Era
        "0xa9268341831efa4937537bc3e9eb36dbece83c7e" => "zkSync Era".to_string(),
        "0x3dB52cE065f728011Ac6732222270b3F2360d919" => "zkSync Era".to_string(),

        // Linea
        "0xd19d4b5d358258f05d7b411e21a1460d11b0876f" => "Linea".to_string(),
        "0xc70ae19b5feaa5c19f576e621d2bad9771864fe2" => "Linea".to_string(),

        // Hemi
        "0x65115c6d23274e0a29a63b69130efe901aa52e7a" => "Hemi".to_string(),

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

async fn get_stats(State(state): State<AppState>) -> Json<Stats> {
    // Check cache first
    {
        let cache = state.cache.stats.read().await;
        if let Some(entry) = cache.as_ref() {
            if entry.is_valid(STATS_TTL) {
                return Json(entry.data.clone());
            }
        }
    }

    // Cache miss - fetch from database
    let db_stats = state.db.get_stats().expect("Failed to get stats");
    let stats = Stats {
        total_blocks: db_stats.total_blocks,
        total_blobs: db_stats.total_blobs,
        total_transactions: db_stats.total_transactions,
        avg_blobs_per_block: db_stats.avg_blobs_per_block,
        latest_block: db_stats.latest_block,
        earliest_block: db_stats.earliest_block,
        latest_gas_price: db_stats.latest_gas_price,
    };

    // Update cache
    {
        let mut cache = state.cache.stats.write().await;
        *cache = Some(CacheEntry::new(stats.clone()));
    }

    Json(stats)
}

async fn get_recent_blocks(State(state): State<AppState>) -> Json<Vec<Block>> {
    // Check cache first
    {
        let cache = state.cache.blocks.read().await;
        if let Some(entry) = cache.as_ref() {
            if entry.is_valid(BLOCKS_TTL) {
                return Json(entry.data.clone());
            }
        }
    }

    // Cache miss - fetch from database
    let block_data = state
        .db
        .get_recent_blocks(50)
        .expect("Failed to get recent blocks");

    let blocks: Vec<Block> = block_data
        .into_iter()
        .map(|b| {
            let transactions: Vec<BlockTransaction> = b
                .transactions
                .into_iter()
                .map(|tx| {
                    let chain = identify_chain(&tx.sender);
                    BlockTransaction {
                        tx_hash: tx.tx_hash,
                        sender: tx.sender,
                        blob_count: tx.blob_count,
                        blob_size: tx.blob_count * BLOB_SIZE_BYTES,
                        chain,
                    }
                })
                .collect();

            let target_utilization = (b.total_blobs as f64 / BLOB_TARGET as f64) * 100.0;
            let saturation_index = (b.total_blobs as f64 / BLOB_MAX as f64) * 100.0;

            Block {
                block_number: b.block_number,
                block_timestamp: b.block_timestamp,
                tx_count: b.tx_count,
                total_blobs: b.total_blobs,
                total_blob_size: b.total_blobs * BLOB_SIZE_BYTES,
                gas_used: b.gas_used,
                gas_price: b.gas_price,
                excess_blob_gas: b.excess_blob_gas,
                transactions,
                target_utilization,
                saturation_index,
            }
        })
        .collect();

    // Update cache
    {
        let mut cache = state.cache.blocks.write().await;
        *cache = Some(CacheEntry::new(blocks.clone()));
    }

    Json(blocks)
}

async fn get_top_senders(State(state): State<AppState>) -> Json<Vec<Sender>> {
    // Check cache first
    {
        let cache = state.cache.senders.read().await;
        if let Some(entry) = cache.as_ref() {
            if entry.is_valid(SENDERS_TTL) {
                return Json(entry.data.clone());
            }
        }
    }

    // Cache miss - fetch from database
    let sender_data = state
        .db
        .get_top_senders(20)
        .expect("Failed to get top senders");

    let senders: Vec<Sender> = sender_data
        .into_iter()
        .map(|s| {
            let chain = identify_chain(&s.address);
            Sender {
                address: s.address,
                tx_count: s.tx_count,
                total_blobs: s.total_blobs,
                total_blob_size: s.total_blobs * BLOB_SIZE_BYTES,
                chain,
            }
        })
        .collect();

    // Update cache
    {
        let mut cache = state.cache.senders.write().await;
        *cache = Some(CacheEntry::new(senders.clone()));
    }

    Json(senders)
}

async fn get_chart_data(
    State(state): State<AppState>,
    Query(params): Query<ChartQuery>,
) -> Json<ChartData> {
    let num_blocks = params.blocks.unwrap_or(100);
    let chart_data = state
        .db
        .get_chart_data(num_blocks)
        .expect("Failed to get chart data");

    Json(ChartData {
        labels: chart_data.labels,
        blobs: chart_data.blobs,
        gas_prices: chart_data.gas_prices,
    })
}

async fn get_blob_transactions(State(state): State<AppState>) -> Json<Vec<BlobTransaction>> {
    // Check cache first
    {
        let cache = state.cache.blob_transactions.read().await;
        if let Some(entry) = cache.as_ref() {
            if entry.is_valid(BLOB_TXS_TTL) {
                return Json(entry.data.clone());
            }
        }
    }

    // Cache miss - fetch from database
    let tx_data = state
        .db
        .get_blob_transactions(50)
        .expect("Failed to get blob transactions");

    let txs: Vec<BlobTransaction> = tx_data
        .into_iter()
        .map(|tx| {
            let chain = identify_chain(&tx.sender);
            BlobTransaction {
                tx_hash: tx.tx_hash,
                block_number: tx.block_number,
                sender: tx.sender,
                blob_count: tx.blob_count,
                blob_size: tx.blob_count * BLOB_SIZE_BYTES,
                gas_price: tx.gas_price,
                chain,
                blob_hashes: tx.blob_hashes,
            }
        })
        .collect();

    // Update cache
    {
        let mut cache = state.cache.blob_transactions.write().await;
        *cache = Some(CacheEntry::new(txs.clone()));
    }

    Json(txs)
}

async fn get_block(
    State(state): State<AppState>,
    Query(params): Query<BlockQuery>,
) -> Json<Option<Block>> {
    let block_number = params.block_number;

    let block_data = state
        .db
        .get_block(block_number)
        .expect("Failed to get block");

    if let Some(b) = block_data {
        let transactions: Vec<BlockTransaction> = b
            .transactions
            .into_iter()
            .map(|tx| {
                let chain = identify_chain(&tx.sender);
                BlockTransaction {
                    tx_hash: tx.tx_hash,
                    sender: tx.sender,
                    blob_count: tx.blob_count,
                    blob_size: tx.blob_count * BLOB_SIZE_BYTES,
                    chain,
                }
            })
            .collect();

        let target_utilization = (b.total_blobs as f64 / BLOB_TARGET as f64) * 100.0;
        let saturation_index = (b.total_blobs as f64 / BLOB_MAX as f64) * 100.0;

        Json(Some(Block {
            block_number: b.block_number,
            block_timestamp: b.block_timestamp,
            tx_count: b.tx_count,
            total_blobs: b.total_blobs,
            total_blob_size: b.total_blobs * BLOB_SIZE_BYTES,
            gas_used: b.gas_used,
            gas_price: b.gas_price,
            excess_blob_gas: b.excess_blob_gas,
            transactions,
            target_utilization,
            saturation_index,
        }))
    } else {
        Json(None)
    }
}

async fn get_all_time_chart(State(state): State<AppState>) -> Json<AllTimeChartData> {
    // Check cache first - this is an expensive query, cache for 5 minutes
    {
        let cache = state.cache.all_time_chart.read().await;
        if let Some(entry) = cache.as_ref() {
            if entry.is_valid(ALL_TIME_CHART_TTL) {
                return Json(entry.data.clone());
            }
        }
    }

    // Cache miss - fetch from database
    // Target ~500 data points for smooth visualization
    let chart_data = state
        .db
        .get_all_time_chart_data(500, BPO2_TIMESTAMP)
        .expect("Failed to get all-time chart data");

    let result = AllTimeChartData {
        labels: chart_data.labels,
        blobs: chart_data.blobs,
        gas_prices: chart_data.gas_prices,
        timestamps: chart_data.timestamps,
        targets: chart_data.targets,
        maxes: chart_data.maxes,
        bpo2_block: chart_data.bpo2_block,
    };

    // Update cache
    {
        let mut cache = state.cache.all_time_chart.write().await;
        *cache = Some(CacheEntry::new(result.clone()));
    }

    Json(result)
}

async fn get_chain_profiles(
    State(state): State<AppState>,
    Query(params): Query<TimeRangeQuery>,
) -> Json<Vec<ChainProfile>> {
    let hours = params.hours.unwrap_or(24);
    let is_all_time = hours >= 87600; // ~10 years means "all time"

    // Check cache first
    if is_all_time {
        let cache = state.cache.chain_profiles_all_time.read().await;
        if let Some(entry) = cache.as_ref() {
            if entry.is_valid(CHAIN_PROFILES_ALL_TIME_TTL) {
                return Json(entry.data.clone());
            }
        }
    } else if hours == 24 {
        let cache = state.cache.chain_profiles.read().await;
        if let Some(entry) = cache.as_ref() {
            if entry.is_valid(CHAIN_PROFILES_TTL) {
                return Json(entry.data.clone());
            }
        }
    }

    // Cache miss - fetch from database
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    let time_limit = now - (hours as i64 * 3600);

    let rows = state
        .db
        .get_transactions_in_time_range(time_limit)
        .expect("Failed to get transactions in time range");

    // Group by chain
    let mut chain_data: HashMap<String, Vec<(u64, i64, u64)>> = HashMap::new();
    let mut grand_total_blobs = 0u64;
    for (sender, blob_count, timestamp, gas_price) in rows {
        let chain = identify_chain(&sender);
        chain_data
            .entry(chain)
            .or_default()
            .push((blob_count, timestamp, gas_price));
        grand_total_blobs += blob_count;
    }

    let mut profiles: Vec<ChainProfile> = chain_data
        .into_iter()
        .map(|(chain, txs)| {
            let total_transactions = txs.len() as u64;
            let total_blobs: u64 = txs.iter().map(|(b, _, _)| b).sum();
            let avg_blobs_per_tx = if total_transactions > 0 {
                total_blobs as f64 / total_transactions as f64
            } else {
                0.0
            };

            let percentage = if grand_total_blobs > 0 {
                (total_blobs as f64 / grand_total_blobs as f64) * 100.0
            } else {
                0.0
            };

            // Calculate average posting interval
            let mut timestamps: Vec<i64> = txs.iter().map(|(_, t, _)| *t).collect();
            timestamps.sort();
            let avg_posting_interval_secs = if timestamps.len() > 1 {
                let intervals: Vec<i64> = timestamps.windows(2).map(|w| w[1] - w[0]).collect();
                intervals.iter().sum::<i64>() as f64 / intervals.len() as f64
            } else {
                0.0
            };

            // Calculate hourly activity distribution (24 hours)
            let mut hourly_counts = [0u64; 24];
            for (_, timestamp, _) in &txs {
                let hour = ((*timestamp % 86400) / 3600) as usize;
                hourly_counts[hour] += 1;
            }
            let max_count = *hourly_counts.iter().max().unwrap_or(&1) as f64;
            let hourly_activity: Vec<f64> = hourly_counts
                .iter()
                .map(|&c| {
                    if max_count > 0.0 {
                        c as f64 / max_count
                    } else {
                        0.0
                    }
                })
                .collect();

            ChainProfile {
                chain,
                total_transactions,
                total_blobs,
                percentage,
                avg_blobs_per_tx,
                avg_posting_interval_secs,
                hourly_activity,
            }
        })
        .collect();

    profiles.sort_by(|a, b| b.total_blobs.cmp(&a.total_blobs));

    // Update cache
    if is_all_time {
        let mut cache = state.cache.chain_profiles_all_time.write().await;
        *cache = Some(CacheEntry::new(profiles.clone()));
    } else if hours == 24 {
        let mut cache = state.cache.chain_profiles.write().await;
        *cache = Some(CacheEntry::new(profiles.clone()));
    }

    Json(profiles)
}

async fn index() -> impl IntoResponse {
    (
        [(header::CONTENT_TYPE, "text/html")],
        Html(include_str!("../web/dist/index.html")),
    )
}

#[tokio::main]
async fn main() -> eyre::Result<()> {
    let db_path = std::env::var("BLOB_DB_PATH").unwrap_or_else(|_| "blob_stats.db".to_string());

    // Create database with thread-safe connection
    let db = Database::new(&db_path)?;

    // Create application state with cache
    let state = AppState {
        db,
        cache: Arc::new(AppCache::new()),
    };

    let static_dir = std::env::var("BLOB_STATIC_DIR").unwrap_or_else(|_| "web/dist".to_string());

    let app = Router::new()
        .route("/", get(index))
        .route("/api/stats", get(get_stats))
        .route("/api/blocks", get(get_recent_blocks))
        .route("/api/block", get(get_block))
        .route("/api/senders", get(get_top_senders))
        .route("/api/chart", get(get_chart_data))
        .route("/api/all-time-chart", get(get_all_time_chart))
        .route("/api/blob-transactions", get(get_blob_transactions))
        .route("/api/chain-profiles", get(get_chain_profiles))
        .nest_service("/assets", ServeDir::new(format!("{}/assets", static_dir)))
        .nest_service("/icons", ServeDir::new(format!("{}/icons", static_dir)))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let addr = std::env::var("BLOB_WEB_ADDR").unwrap_or_else(|_| "0.0.0.0:3500".to_string());
    let listener = tokio::net::TcpListener::bind(&addr).await?;

    println!("ExBlob running at http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

-- Migration script to update existing database schema
-- Run this before starting the new version

-- Add block_timestamp column to existing blocks table if it doesn't exist
-- SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS, so we need to check first

-- Create new blocks table with timestamp
CREATE TABLE IF NOT EXISTS blocks_new (
    block_number INTEGER PRIMARY KEY,
    block_timestamp INTEGER NOT NULL DEFAULT 0,
    tx_count INTEGER NOT NULL,
    total_blobs INTEGER NOT NULL,
    gas_used INTEGER NOT NULL,
    gas_price INTEGER NOT NULL
);

-- Copy existing data (set timestamp to 0 for old data)
INSERT INTO blocks_new (block_number, block_timestamp, tx_count, total_blobs, gas_used, gas_price)
SELECT block_number, 0, tx_count, total_blobs, gas_used, gas_price
FROM blocks;

-- Drop old table and rename new one
DROP TABLE blocks;
ALTER TABLE blocks_new RENAME TO blocks;

-- Create new tables for blob transactions
CREATE TABLE IF NOT EXISTS blob_transactions (
    tx_hash TEXT PRIMARY KEY,
    block_number INTEGER NOT NULL,
    sender TEXT NOT NULL,
    blob_count INTEGER NOT NULL,
    gas_price INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (block_number) REFERENCES blocks(block_number)
);

CREATE TABLE IF NOT EXISTS blob_hashes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tx_hash TEXT NOT NULL,
    blob_hash TEXT NOT NULL,
    blob_index INTEGER NOT NULL,
    FOREIGN KEY (tx_hash) REFERENCES blob_transactions(tx_hash)
);

CREATE INDEX IF NOT EXISTS idx_blob_txs_block ON blob_transactions(block_number);
CREATE INDEX IF NOT EXISTS idx_blob_txs_sender ON blob_transactions(sender);
CREATE INDEX IF NOT EXISTS idx_blob_txs_created ON blob_transactions(created_at);

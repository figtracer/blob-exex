#!/bin/bash

# Migration script to update the database schema
# Usage: ./migrate.sh [path_to_db]

DB_PATH="${1:-blob_stats.db}"

if [ ! -f "$DB_PATH" ]; then
    echo "Database file not found: $DB_PATH"
    echo "If this is a new installation, no migration is needed."
    exit 0
fi

echo "Backing up database to ${DB_PATH}.backup..."
cp "$DB_PATH" "${DB_PATH}.backup"

echo "Running migration..."
sqlite3 "$DB_PATH" < migrate.sql

if [ $? -eq 0 ]; then
    echo "Migration completed successfully!"
    echo "Backup saved at: ${DB_PATH}.backup"
else
    echo "Migration failed! Restoring backup..."
    mv "${DB_PATH}.backup" "$DB_PATH"
    exit 1
fi

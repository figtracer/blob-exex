#!/bin/bash

# Build script for Blob Explorer Web UI
# This script builds the React app and preserves the icons folder

set -e

echo "🚀 Building Blob Explorer Web UI..."

# Store the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATIC_DIR="$SCRIPT_DIR/../static"
ICONS_DIR="$STATIC_DIR/icons"

# Check if icons directory exists
if [ ! -d "$ICONS_DIR" ]; then
    echo "⚠️  Warning: Icons directory not found at $ICONS_DIR"
    echo "   Chain icons will not be available."
fi

# Create a temporary backup of icons if they exist
TEMP_ICONS_DIR=$(mktemp -d)
if [ -d "$ICONS_DIR" ]; then
    echo "📦 Backing up icons..."
    cp -r "$ICONS_DIR" "$TEMP_ICONS_DIR/"
fi

# Clean the static directory except icons
echo "🧹 Cleaning old build..."
find "$STATIC_DIR" -mindepth 1 -maxdepth 1 ! -name 'icons' -exec rm -rf {} +

# Build the React app
echo "🔨 Building React app..."
npm run build

# Restore icons
if [ -d "$TEMP_ICONS_DIR/icons" ]; then
    echo "♻️  Restoring icons..."
    cp -r "$TEMP_ICONS_DIR/icons" "$STATIC_DIR/"
fi

# Cleanup temp directory
rm -rf "$TEMP_ICONS_DIR"

echo "✅ Build complete! Output is in $STATIC_DIR"
echo ""
echo "📊 Build summary:"
echo "   - HTML: $(find "$STATIC_DIR" -name "*.html" | wc -l | tr -d ' ') file(s)"
echo "   - JS/CSS: $(find "$STATIC_DIR/assets" -type f 2>/dev/null | wc -l | tr -d ' ') file(s)"
echo "   - Icons: $(find "$ICONS_DIR" -name "*.png" 2>/dev/null | wc -l | tr -d ' ') file(s)"
echo ""
echo "🎉 Ready to run the Rust backend!"

#!/bin/bash

# Build script for Blob Explorer Web UI

set -e

echo "Building Blob Explorer Web UI..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$SCRIPT_DIR"
npx vite build

echo "Build complete! Output is in $SCRIPT_DIR/dist"
echo ""
echo "Build summary:"
echo "   - HTML: $(find dist -name "*.html" | wc -l | tr -d ' ') file(s)"
echo "   - JS/CSS: $(find dist/assets -type f 2>/dev/null | wc -l | tr -d ' ') file(s)"
echo "   - Icons: $(find dist/icons -name "*.png" 2>/dev/null | wc -l | tr -d ' ') file(s)"
echo ""

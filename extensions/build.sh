#!/bin/bash
# Build Chrome and/or Firefox extension packages
# Usage: ./build.sh [environment] [browser]
#
# environment: preview (default) | production | development
# browser:     all (default) | chrome | firefox
#
# Examples:
#   ./build.sh                     → builds both, preview
#   ./build.sh production          → builds both, production
#   ./build.sh preview chrome      → Chrome only
#   ./build.sh preview firefox     → Firefox only

ENV="${1:-preview}"
BROWSER="${2:-all}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

build_browser() {
  local browser="$1"
  local dist="${SCRIPT_DIR}/dist/${browser}"

  echo "📦 Building ${browser} (${ENV})..."

  # Clean and recreate dist folder
  rm -rf "$dist"
  mkdir -p "$dist"
  cp -r "${SCRIPT_DIR}/shared/." "$dist"

  # Copy browser-specific manifest
  cp "${SCRIPT_DIR}/${browser}/manifest.json" "$dist/manifest.json"

  # Generate env config files into dist
  node "${SCRIPT_DIR}/build-config.js" "$ENV" "$browser"

  echo "✅ ${browser} → dist/${browser}/"
}

case "$BROWSER" in
  chrome)  build_browser chrome ;;
  firefox) build_browser firefox ;;
  *)       build_browser chrome; build_browser firefox ;;
esac

echo ""
echo "Done. Load unpacked from dist/chrome or dist/firefox in your browser."

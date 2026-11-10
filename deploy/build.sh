#!/usr/bin/env bash
# Builds the site into dist/. dist/ is the only thing that gets published: GitHub Pages
# (.github/workflows/pages.yml) and the home server (deploy/install.sh) serve the same files.
# Vite puts a content hash in the name of every file it compiles, so no cache mixes two versions,
# and base: './' (vite.config.ts) keeps every path relative. Needs Node and npm.
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
npm run build
echo "dist/ ready"

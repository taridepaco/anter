#!/usr/bin/env bash
# Run by .github/workflows/pages.yml before deploy/build.sh: if it fails, nothing is published.
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
npm test

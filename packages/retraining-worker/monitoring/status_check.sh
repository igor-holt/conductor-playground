#!/usr/bin/env bash
set -u

fail() { echo "FAIL [$1] $2"; exit "$1"; }

command -v wrangler >/dev/null || fail 1 "wrangler missing"
wrangler deployments list --config "$(dirname "$0")/../wrangler.toml" 2>/dev/null | grep -q "genesis-retraining-worker" || fail 2 "no recent deployment"
wrangler d1 execute genesis-seismic-log --config "$(dirname "$0")/../wrangler.toml" --command "SELECT 1;" >/dev/null 2>&1 || fail 3 "D1 unreachable"

if [ -n "${GENESIS_API_BASE_URL:-}" ]; then
  curl -fsSL "${GENESIS_API_BASE_URL%/}/healthz" >/dev/null || fail 4 "healthz failed"
fi

echo "OK"
exit 0

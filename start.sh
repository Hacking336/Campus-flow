#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ -x "$PWD/.tools/node/bin/node" ]; then
  export PATH="$PWD/.tools/node/bin:$PATH"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "CampusFlow needs Node.js 22.5 or newer (for the built-in SQLite module)."
  echo "Install Node, or place a portable runtime in .tools/node."
  exit 1
fi

if ! node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 5) ? 0 : 1)'; then
  echo "Node.js 22.5+ is required; found $(node -v)."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies…"
  npm install --no-audit --no-fund
fi

if [ "${1:-}" = "--prod" ] || [ "${1:-}" = "--build" ]; then
  npm run build
  exec node server/index.js
fi

exec npm run dev

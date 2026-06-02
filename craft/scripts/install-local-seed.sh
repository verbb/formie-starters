#!/usr/bin/env bash

set -euo pipefail

CRAFT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$CRAFT_ROOT"

if ! command -v ddev >/dev/null 2>&1; then
    echo "DDEV is required to install the local starter seed." >&2
    exit 1
fi

if [[ ! -f "seeds/formie-starters.sql.gz" ]]; then
    echo "Missing seeds/formie-starters.sql.gz." >&2
    exit 1
fi

ddev start
ddev composer install
ddev import-db --file=seeds/formie-starters.sql.gz
ddev craft up --interactive=0
ddev craft project-config/apply --interactive=0
ddev craft clear-caches/all

cat <<'EOF'

Formie Craft starter is ready.

URL: https://craft.ddev.site:8443/
Control panel: https://craft.ddev.site:8443/admin
Username: admin
Password: password
EOF

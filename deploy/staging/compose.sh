#!/bin/sh
set -eu
directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
exec docker compose --project-name "${STAGING_PROJECT:-bubble-private-staging}" \
  --env-file "${STAGING_ENV_FILE:-$directory/.env}" -f "$directory/compose.yml" "$@"

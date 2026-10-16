#!/bin/sh
set -eu
umask 077
set -C
directory=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
: "${1:?Pass a NEW absolute backup path outside Git}"
case "$1" in /*) ;; *) echo 'Use an absolute backup path.' >&2; exit 1;; esac
# Open before cleanup is possible: a pre-existing file is never removed.
exec 3> "$1"
if ! sh "$directory/compose.sh" exec -T db pg_dump -U postgres -d bubble_staging --format=custom >&3; then
  rm -f -- "$1"
  exit 1
fi
echo 'Backup created. Verify it with pg_restore --list and a restore drill.'

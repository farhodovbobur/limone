#!/bin/sh
# Migration helper — adds the folder path so you only type the NAME (Laravel-style):
#   npm run migration:create <Name>
#   npm run migration:generate <Name> [-- --dr | -p ...]
#
# Called from package.json as: sh scripts/migration.sh <create|generate> <Name> [flags]

MIGRATIONS_DIR="src/database/migrations"
DATA_SOURCE="src/database/data-source.ts"

command=$1
name=$2
[ $# -ge 2 ] && shift 2 || shift $#

if [ -z "$name" ]; then
  echo "Name required:  npm run migration:$command <Name>"
  exit 1
fi

case "$command" in
  create)
    # create only writes an empty file — no DB, no -d needed
    exec npx typeorm-ts-node-commonjs migration:create "$MIGRATIONS_DIR/$name" "$@"
    ;;
  generate)
    exec npx typeorm-ts-node-commonjs -d "$DATA_SOURCE" migration:generate "$MIGRATIONS_DIR/$name" "$@"
    ;;
  *)
    echo "Unknown command: $command (expected: create or generate)"
    exit 1
    ;;
esac

#!/usr/bin/env bash

cd "$(dirname "$0")"

mkdir -p mcp

# 同梱したい MCP サーバをここに書く
bun tsup "node_modules/@suekou/mcp-notion-server/build/index.js" -d mcp --minify --format esm --onSuccess "mv mcp/index.js mcp/notion.mcp-server.js"

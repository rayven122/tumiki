#!/usr/bin/env bash

cd "$(dirname "$0")"

mkdir -p mcp

# 同梱したい MCP サーバをここに書く
pnpm exec ncc build "node_modules/@suekou/mcp-notion-server/build/index.js" -o mcp -m
mv mcp/index.js mcp/notion.mcp-server.js

pnpm exec ncc build "node_modules/@modelcontextprotocol/server-github/dist/index.js" -o mcp -m
mv mcp/index.js mcp/github.mcp-server.js
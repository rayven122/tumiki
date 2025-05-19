#!/usr/bin/env bash

cd "$(dirname "$0")"

mkdir -p mcp

# 同梱したい MCP サーバをここに書く
bun ncc build "node_modules/@suekou/mcp-notion-server/build/index.js" -o mcp -m
mv mcp/index.js mcp/notion.mcp-server.js

bun ncc build "node_modules/@modelcontextprotocol/server-github/dist/index.js" -o mcp -m
mv mcp/index.js mcp/github.mcp-server.js

bun ncc build "node_modules/@modelcontextprotocol/server-filesystem/dist/index.js" -o mcp -m
mv mcp/index.js mcp/filesystem.mcp-server.js

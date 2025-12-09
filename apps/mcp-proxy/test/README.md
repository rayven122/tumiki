# MCP Proxy 検証ガイド

## 目的

このスクリプトは、mcp-proxyのMCP (Model Context Protocol) 実装を検証するためのものです。
API Key認証、ツールリスト取得、ツール実行などのMCPプロトコルの動作を確認できます。

## セットアップ

```bash
# 1. テストDBを起動
docker compose -f ./docker/compose.yaml up -d db-test

# 2. スキーマ適用
cd packages/db && pnpm db:push:test

# 3. テストデータ投入
cd apps/mcp-proxy && pnpm test:seed

# 4. mcp-proxy起動
pnpm dev
```

## 検証実行

```bash
# 自動検証スクリプト
pnpm test:verify
```

### 検証内容

1. ✅ API Key認証（Tumiki-API-Keyヘッダー）
2. ✅ 無効なAPIキーの拒否
3. ✅ ツールリストの取得
4. ✅ ツールの実行（resolve-library-id）

## 手動検証（curl）

```bash
# 環境変数設定
export API_KEY="test-api-key-12345-verification"
export MCP_SERVER_ID="mcp_server_verification"
export PROXY_URL="http://localhost:8080"

# ツールリスト取得
curl -X POST "${PROXY_URL}/mcp/${MCP_SERVER_ID}" \
  -H "Tumiki-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list",
    "params": {}
  }'

# ツール実行
curl -X POST "${PROXY_URL}/mcp/${MCP_SERVER_ID}" \
  -H "Tumiki-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "Context7__resolve-library-id",
      "arguments": {
        "libraryName": "react"
      }
    }
  }'
```

## テストデータ

```
User:         mcp-proxy-test-user
Organization: org_mcp_proxy_test
API Key:      test-api-key-12345-verification
Server ID:    mcp_server_verification
Template:     mcp_template_context7 (Context7, STREAMABLE_HTTPS)
Tools:        resolve-library-id, get-library-docs
```

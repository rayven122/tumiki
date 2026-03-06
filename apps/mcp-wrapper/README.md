# mcp-wrapper

stdio MCP サーバーを動的に起動・管理する HTTP ラッパーサービス。

## 概要

mcp-wrapper は単一の HTTP エンドポイントで複数の stdio MCP サーバーを動的に起動・管理します。カタログに登録された MCP サーバーをリクエスト時にオンデマンドで起動し、プロセスプールで効率的に管理します。

```
Claude Desktop / Client
       │
       ▼
mcp-proxy (認証・ルーティング)
       │
       │  HTTP (VPC内通信)
       ▼
mcp-wrapper (このサービス)
       │
       │  stdio
       ▼
MCP サーバープロセス (npx -y <package>)
```

## スコープ

**対象: 環境変数ベースの MCP サーバーのみ**

| 種類 | 対象 | 理由 |
|------|------|------|
| 環境変数ベース | ✅ | メモリ分離で安全、約 90% の MCP サーバー |
| OAuth/ファイルベース | ❌ | Cloud Run (SSE/HTTPS) で対応 |

## 主要機能

| 機能 | 説明 |
|------|------|
| 動的プロセス起動 | カタログに基づき MCP サーバーをオンデマンド起動 |
| プロセスプール | 最大 N 個のプロセスを管理、LRU eviction |
| ヘッダー→環境変数変換 | HTTP ヘッダーを環境変数に変換してプロセスに注入 |
| アイドルタイムアウト | 未使用プロセスを自動停止 |

## API

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/health` | GET | ヘルスチェック |
| `/status` | GET | プロセスプール状態 |
| `/mcp/:serverName` | POST | MCP リクエスト転送 |

### リクエスト例

```bash
# MCP サーバーにリクエストを送信
curl -X POST http://localhost:8080/mcp/deepl \
  -H "Content-Type: application/json" \
  -H "X-DeepL-API-Key: your-api-key" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 環境変数

| 変数 | 説明 | デフォルト |
|------|------|-----------|
| `PORT` | HTTP サーバーポート | `8080` |
| `MAX_PROCESSES` | 最大プロセス数 | `20` |
| `IDLE_TIMEOUT_MS` | アイドルタイムアウト (ms) | `300000` (5分) |
| `REQUEST_TIMEOUT_MS` | リクエストタイムアウト (ms) | `60000` (1分) |
| `DATABASE_URL` | PostgreSQL 接続文字列 | - |

## 開発

```bash
# 開発サーバー起動
pnpm dev

# 型チェック
pnpm typecheck

# リント
pnpm lint

# テスト
pnpm test
```

## アーキテクチャ

DDD + CQRS + Vertical Slice Architecture（mcp-proxy と同じ）

```
src/
├── domain/           # 純粋ドメイン（外部依存なし）
│   ├── types/        # 型定義
│   ├── values/       # 値オブジェクト
│   ├── errors/       # ドメインエラー
│   └── services/     # ドメインサービス
├── features/         # Vertical Slice
│   ├── health/       # ヘルスチェック
│   ├── status/       # プロセスプール状態
│   └── mcp/          # MCP リクエスト転送
├── infrastructure/   # 外部サービスアダプタ
│   ├── db/           # DB リポジトリ
│   └── process/      # プロセス管理
└── shared/           # 横断的関心事
    ├── constants/    # 設定定数
    ├── logger/       # ログユーティリティ
    └── types/        # 共通型
```

## セキュリティ

- **メモリ分離**: 各プロセスは独立した Node.js プロセス
- **環境変数ベースのみ**: ファイルシステムへの書き込みなし
- **API キー**: ログに出力しない

## 関連ドキュメント

- [設計書](../../docs/proposals/mcp-wrapper-design.md)
- [カタログ API 設計書](../../docs/proposals/catalog-api-design.md)

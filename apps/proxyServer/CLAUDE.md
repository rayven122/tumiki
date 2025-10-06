# CLAUDE.md - ProxyServer開発ガイド

## 概要

このドキュメントは、Claude Code が ProxyServer アプリケーションで作業する際のガイドラインです。

## アーキテクチャ概要

### コア機能

- **MCPサーバー統合管理**: 複数のMCPサーバーを単一エンドポイントで管理
- **マルチトランスポート対応**: Streamable HTTP TransportとSSE Transport
- **統合認証**: APIキー認証とOAuth2.0/JWT認証の両方をサポート
- **セッション管理**: 永続的なMCPサーバー接続の管理

### ディレクトリ構造

```
apps/proxyServer/
├── src/
│   ├── index.ts                 # メインエントリーポイント
│   ├── routes/
│   │   ├── mcp/                # MCP通信エンドポイント
│   │   │   ├── index.ts        # 統合MCPハンドラー
│   │   │   ├── post.ts         # POST リクエスト処理
│   │   │   ├── get.ts          # GET リクエスト処理
│   │   │   └── delete.ts       # DELETE リクエスト処理
│   │   ├── health/             # ヘルスチェック
│   │   └── oauth/              # OAuth関連エンドポイント
│   ├── middleware/
│   │   ├── integratedAuth.ts   # 統合認証ミドルウェア
│   │   ├── logging.ts          # ロギングミドルウェア
│   │   └── maintenance.ts      # メンテナンスモード
│   ├── utils/
│   │   ├── transport.ts        # トランスポート関連ユーティリティ
│   │   ├── errorResponse.ts    # エラーレスポンス処理
│   │   └── sessionManager.ts   # セッション管理
│   └── libs/
│       ├── startup.js          # アプリケーション初期化
│       └── logger.js           # Winstonロガー設定
├── scripts/
│   └── test-mcp-inspector.sh   # MCP Inspector検証スクリプト
├── ecosystem.config.cjs         # PM2設定
└── package.json
```

## 開発ガイドライン

### コーディング規約

- **関数定義**: アロー関数を使用（`const fn = () => {}`）
- **型定義**: `type` のみ使用（`interface` は使用しない）
- **エラーハンドリング**: JSON-RPC 2.0仕様に準拠したエラーレスポンス
- **非同期処理**: async/awaitパターンを使用
- **ログ**: Winstonロガーを使用、構造化ログ形式

### 認証フロー

1. **統合認証ミドルウェア（integratedAuth.ts）**
   - リクエストから認証情報を抽出
   - authTypeに基づいて適切な認証方式を適用
   - 認証成功時は`req.authInfo`にユーザー情報を設定

2. **認証タイプ（authType）**
   - `API_KEY`: APIキー認証のみ
   - `OAUTH`: OAuth2.0/JWT認証のみ
   - `NONE`: セキュリティ上使用不可（403エラー）
   - `BOTH`: 現在未対応（501エラー）

### セッション管理

- セッションマネージャー（`utils/session.ts`）が管理
- MCPサーバーとの永続的接続を保持
- セッション独立型MCPプール管理（`utils/mcpPool.ts`）
- タイムアウト設定が同期化（デフォルト60秒）
- 自動クリーンアップとヘルスチェック機能

### エラーハンドリング

JSON-RPC 2.0エラーコード：

- `-32700`: Parse error
- `-32600`: Invalid Request
- `-32601`: Method not found
- `-32602`: Invalid params
- `-32603`: Internal error
- `-32000～-32099`: Server error

### MCP通信フロー

1. **リクエスト受信**: `/mcp/{mcpServerInstanceId}`
2. **認証チェック**: 統合認証ミドルウェア
3. **セッション管理**: 既存セッションの取得または新規作成
4. **MCPサーバー接続**: TransportまたはSSE接続を確立
5. **メッセージ転送**: JSON-RPCメッセージを転送
6. **レスポンス返却**: クライアントへレスポンスを返却

## 開発コマンド

```bash
# 開発環境起動
pnpm dev

# ビルド
pnpm build

# 型チェック
pnpm typecheck      # 安定版（tsc）
pnpm typecheck:dev  # 高速版（tsgo）

# テスト
pnpm test           # 単体テスト実行
pnpm test:watch     # ウォッチモード
pnpm test:coverage  # カバレッジ測定

# 検証
pnpm verify         # MCP Inspector検証

# PM2管理（本番環境）
pnpm pm2:start      # サーバー起動
pnpm pm2:logs       # ログ確認
pnpm pm2:status     # ステータス確認
pnpm pm2:restart    # 再起動
```

## テスト戦略

### 単体テスト

- Vitestフレームワーク使用
- `src/__tests__/` ディレクトリに配置
- モック: vitest-mock-extended使用
- カバレッジ目標: 実装ロジック100%

### 統合テスト

- MCP Inspectorを使用した検証
- `scripts/test-mcp-inspector.sh`で自動化
- Streamable HTTPとSSEの両方をテスト

### テスト環境

- テスト用MCPサーバー: `@tumiki/db`のテストサーバー
- モックAPIキー: `TEST_API_KEY`環境変数

## トラブルシューティング

### よくある問題と解決方法

1. **MCPサーバーへの接続失敗**
   - MCPサーバーのURLとポートを確認
   - ネットワーク接続を確認
   - MCPサーバーのログを確認

2. **認証エラー**
   - authTypeの設定を確認
   - APIキーまたはトークンの有効性を確認
   - 認証ヘッダーの形式を確認

3. **セッションタイムアウト**
   - クライアント側でセッションIDを保持
   - 定期的なキープアライブの実装を検討

4. **メモリリーク**
   - PM2のメモリ使用量を監視
   - セッションクリーンアップを確認
   - ExpireMapの設定を調整

## デプロイメント

### 本番環境への展開

1. **ビルド**: `pnpm build`
2. **環境変数設定**: `.env`ファイルを設定
3. **PM2起動**: `pnpm pm2:start`
4. **ヘルスチェック**: `/health`エンドポイントを確認
5. **ログ監視**: `pnpm pm2:logs`でログを確認

### 環境変数

必須の環境変数：

```env
# サーバー設定
PORT=8080
NODE_ENV=production

# セッション管理
MAX_SESSIONS=200                      # 最大セッション数
CONNECTION_TIMEOUT_MS=60000           # セッションタイムアウト（60秒）

# MCPプール設定
MCP_POOL_MAX_TOTAL=6000               # 全体の最大接続数（30接続×200セッション想定）
MCP_POOL_MAX_PER_SERVER=5             # サーバーあたり最大接続数
MAX_CONNECTIONS_PER_SESSION=30        # セッションあたり最大接続数
MCP_CONNECTION_TIMEOUT_MS=60000       # MCPプールタイムアウト（セッションと同期）
MCP_POOL_CLEANUP_INTERVAL_MS=30000    # クリーンアップ間隔（30秒）
SESSION_POOL_SYNC=true                 # セッション独立プール有効化

# Auth0設定（OAuth認証使用時）
AUTH0_DOMAIN=your-auth0-domain.com
AUTH0_M2M_DOMAIN=your-tenant.auth0.com
AUTH0_M2M_CLIENT_ID=your-m2m-client-id
AUTH0_M2M_CLIENT_SECRET=your-m2m-client-secret

# データベース設定
DATABASE_URL=postgresql://...

# ログ設定
LOG_LEVEL=info
```

## パフォーマンス最適化

### 推奨事項

- セッションの適切な管理とクリーンアップ
- 非同期処理の適切な使用
- メモリ使用量の監視（PM2メトリクス）
- 適切なエラーハンドリングとリトライロジック

### メトリクス監視

- PM2ダッシュボードでCPU/メモリ使用量を監視
- Winstonログでエラー率を追跡
- レスポンスタイムの測定と最適化

## セキュリティ考慮事項

1. **認証の強制**: すべてのMCPエンドポイントで認証を必須化
2. **APIキーの管理**: 暗号化された保存とローテーション
3. **CORS設定**: 許可されたオリジンのみを受け入れ
4. **レート制限**: 将来的な実装を検討
5. **入力検証**: JSON-RPCリクエストの検証
6. **ログのサニタイズ**: 機密情報をログに出力しない

## 完了条件

- `pnpm format:fix`, `pnpm lint:fix`, `pnpm typecheck`, `pnpm build` が全て成功
- 単体テストのカバレッジ100%
- MCP Inspector検証が成功
- PM2での本番環境デプロイが正常動作
- ドキュメントの更新完了

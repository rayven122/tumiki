# Tumiki 開発コマンド一覧

## 基本開発コマンド
```bash
# 開発サーバーの起動（全アプリケーション）
pnpm dev

# ビルド
pnpm build

# 本番サーバーの起動
pnpm start
```

## コード品質チェック（タスク完了時に必須）
```bash
# 全品質チェック（lint + format + typecheck）を並列実行
pnpm check

# 個別実行
pnpm lint:fix      # ESLintエラーを自動修正
pnpm format:fix    # Prettierでコードフォーマット
pnpm typecheck     # TypeScript型チェック
```

## テスト実行
```bash
# テスト実行
pnpm test         # 全テスト実行（vitest run）
pnpm test:watch   # ウォッチモード（vitest）
pnpm test:coverage # カバレッジ測定
pnpm test:ui      # Vitest UI起動
```

## データベース操作
```bash
# Prismaクライアント生成（@tumiki/dbパッケージ）
pnpm db:generate

# データベースマイグレーション（packages/dbディレクトリで実行）
cd packages/db
pnpm db:migrate   # マイグレーション実行
pnpm db:deploy    # 本番環境へデプロイ
pnpm db:studio    # Prisma Studio起動
```

## ProxyServer管理
```bash
# MCP Inspector（接続テスト）
pnpm inspector

# MCP Proxy管理（apps/mcp-proxyディレクトリで実行）
cd apps/mcp-proxy
pnpm dev          # 開発サーバー起動
pnpm build        # ビルド
pnpm start        # 本番サーバー起動
pnpm test         # テスト実行
```

## デプロイメント
```bash
# アプリケーションのビルド
pnpm build

# サーバー起動
pnpm start
```

## 環境変数管理
```bash
# Stripe環境変数検証
pnpm verify:stripe
pnpm stripe:listen  # Webhookをローカルに転送
```

## クリーンアップ
```bash
pnpm clean              # node_modules削除
pnpm clean:workspaces   # 各ワークスペースのクリーンアップ
```

## macOS（Darwin）固有のコマンド
```bash
# 基本的なUnixコマンドが利用可能
ls      # ファイル一覧
cd      # ディレクトリ移動
grep    # テキスト検索（ripgrep推奨: rg）
find    # ファイル検索
git     # バージョン管理

# macOS固有の注意点
# - GNU版とBSD版のコマンドの違いに注意
# - timeoutコマンドはgtimeoutを使用（GNU coreutils）
# - sedコマンドは -i '' オプションが必要な場合がある
```

## Docker操作
```bash
# 開発環境（自己署名SSL）
docker compose -f ./docker/compose.yaml up -d

# 本番環境（Let's Encrypt SSL）
docker compose -f ./docker/compose.prod.yaml up -d

# 停止
docker compose -f ./docker/compose.yaml stop
docker compose -f ./docker/compose.prod.yaml down
```

## パッケージ管理
```bash
# 依存関係チェック
pnpm lint:ws

# @tumiki/パッケージのビルド（importエラー時）
cd packages/[package-name]
pnpm build
```

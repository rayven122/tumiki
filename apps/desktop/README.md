# tumiki Desktop

Electronベースのtumikiデスクトップアプリケーション。MCPサーバーの管理・監視を行うネイティブクライアント。

## セットアップ

1. **環境変数の設定**

   ルートの `.env` に以下を追加:

   ```bash
   DESKTOP_DATABASE_URL="file:./db.sqlite"
   ```

2. **DBのセットアップ**

   ```bash
   cd apps/desktop
   pnpm db:migrate    # マイグレーション作成・適用
   pnpm db:generate   # Prismaクライアント生成
   ```

3. **開発サーバー起動**

   ```bash
   pnpm dev
   ```

## 開発コマンド

```bash
# 開発モード起動
pnpm dev

# ビルド
pnpm build

# プレビュー（ビルド後）
pnpm start

# 型チェック
pnpm typecheck      # 通常版（tsc）
pnpm typecheck:dev  # 高速版（tsgo）

# リント
pnpm lint
pnpm lint:fix

# フォーマット
pnpm format
pnpm format:fix

# テスト
pnpm test
pnpm test:watch
pnpm test:coverage

# クリーンアップ
pnpm clean

# DB関連
pnpm db:generate      # Prismaクライアント生成
pnpm db:push          # スキーマをDBに反映
pnpm db:migrate       # マイグレーション作成・適用
pnpm db:studio        # Prisma Studio起動

# リリースビルド
pnpm build:mac        # macOS用ビルド
pnpm build:release    # リリース用パッケージング
```

## リリース手順

新しいバージョンをリリースする場合:

1. **バージョンの更新**

   ```bash
   # package.json のバージョンを更新
   cd apps/desktop
   npm version patch  # または minor, major
   ```

2. **リリースタグの作成とプッシュ**

   ```bash
   # タグを作成してプッシュ（desktop-v接頭辞を付ける）
   git tag desktop-v0.1.0
   git push origin desktop-v0.1.0
   ```

3. **自動ビルドとリリース**
   - GitHub Actions が自動的にトリガーされます
   - macOS用のアプリケーションがビルドされます（x64とarm64）
   - GitHub Releaseが自動作成されます
   - DMGとZIPファイルがアップロードされます

4. **手動リリース（必要な場合）**

   ```bash
   # ローカルでビルド
   pnpm build:release

   # 生成されたファイルは out/ ディレクトリに配置されます
   # - Tumiki-{version}-x64.dmg
   # - Tumiki-{version}-arm64.dmg
   # - Tumiki-{version}-mac.zip
   ```

### コード署名と公証（将来対応）

現在のビルドは署名・公証されていません。将来的に対応する場合:

1. **Apple Developer Programへの登録**
   - 年間99ドルの登録料が必要

2. **証明書の取得**
   - Developer ID Application証明書を取得

3. **環境変数の設定**

   ```bash
   # GitHub Secretsに以下を設定
   MACOS_CERTIFICATE          # Base64エンコードされた証明書
   MACOS_CERTIFICATE_PASSWORD # 証明書のパスワード
   APPLE_ID                   # Apple ID
   APPLE_APP_SPECIFIC_PASSWORD # App-specific パスワード
   APPLE_TEAM_ID              # Team ID
   ```

4. **electron-builder.yml の更新**
   - コメントアウトされた署名・公証設定のコメントを解除

詳細は [electron-builder.yml](./electron-builder.yml) と [.github/workflows/desktop-release.yml](../../.github/workflows/desktop-release.yml) を参照。

## プロジェクト構造

```
apps/desktop/
├── src/
│   ├── main/              # Electronメインプロセス
│   │   ├── index.ts       # エントリーポイント
│   │   ├── window.ts      # ウィンドウ管理
│   │   ├── db/            # ローカルDB（Prisma SQLite）
│   │   ├── ipc/           # IPC通信ハンドラー（認証等）
│   │   └── utils/         # ユーティリティ（暗号化、ロガー）
│   ├── preload/           # Preloadスクリプト
│   │   └── index.ts       # ContextBridge設定
│   ├── renderer/          # Reactレンダラープロセス
│   │   ├── index.html     # HTMLエントリーポイント
│   │   ├── main.tsx       # Reactエントリーポイント
│   │   ├── App.tsx        # ルートコンポーネント
│   │   ├── _components/   # UIコンポーネント
│   │   ├── pages/         # ページ（Dashboard, McpServers, Settings）
│   │   ├── server/        # tRPC API設定
│   │   ├── store/         # Jotai atoms
│   │   ├── styles/        # Tailwind CSS
│   │   ├── types/         # 型定義
│   │   └── utils/         # ユーティリティ（tRPC, エラーハンドリング）
│   ├── shared/            # メイン・レンダラー共通型定義
│   │   └── types.ts
│   └── types/             # プロセス横断型定義（認証、ログ同期）
├── prisma/
│   └── schema.prisma      # ローカルDB定義（SQLite）
├── electron-builder.yml
├── electron.vite.config.ts
├── tsconfig.json
└── package.json
```

## 技術スタック

- **Electron**: v34.x
- **React**: v19 (catalog:react19)
- **TypeScript**: v5.x (catalog)
- **Vite**: electron-vite v4.x
- **Tailwind CSS**: v4.x (catalog)
- **Jotai**: v2.x（状態管理）
- **tRPC**: クライアント統合（@trpc/client, @trpc/react-query）
- **Prisma**: v6.x（SQLite、ローカルDB）
- **react-router-dom**: v7.x（ページルーティング）

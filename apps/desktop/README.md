# tumiki Desktop

Electronベースのtumikiデスクトップアプリケーション

## Phase 1 完了 ✅

Phase 1（基本起動）が完了しました：

- ✅ プロジェクト構造作成
- ✅ package.json設定（tumiki標準準拠）
- ✅ TypeScript設定（`@tumiki/tsconfig`継承）
- ✅ electron-vite設定
- ✅ Electronメインプロセス実装
- ✅ Preloadスクリプト実装（contextBridge）
- ✅ Reactレンダラー実装（基本UI）
- ✅ ビルド成功確認

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

```

## プロジェクト構造

```

apps/desktop/
├── src/
│ ├── main/ # Electronメインプロセス
│ │ ├── index.ts # エントリーポイント
│ │ └── window.ts # ウィンドウ管理
│ ├── preload/ # Preloadスクリプト
│ │ └── index.ts # ContextBridge設定
│ ├── renderer/ # Reactレンダラープロセス
│ │ ├── index.html # HTMLエントリーポイント
│ │ ├── main.tsx # Reactエントリーポイント
│ │ ├── App.tsx # ルートコンポーネント
│ │ └── styles/ # Tailwind CSS
│ └── shared/ # 共通型定義
│ └── types.ts
├── resources/ # アプリケーションリソース
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

## 次のステップ（Phase 2以降）

- [ ] MCPサーバー統合
- [ ] 設定管理（electron-store）
- [ ] システムトレイ実装
- [ ] 自動アップデート（electron-updater）
- [ ] パッケージング（dmg/exe/deb）

## 開発ガイドライン

tumikiプロジェクトの標準に準拠：

- 関数定義: アロー関数使用
- 型定義: `type` のみ使用（`interface` は使用しない）
- コンポーネント: `_components/` ディレクトリに配置
- テスト: Vitest使用、カバレッジ100%目標

詳細は [プロジェクトルートのCLAUDE.md](../../CLAUDE.md) を参照。
```

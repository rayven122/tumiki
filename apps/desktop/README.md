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
```

## プロジェクト構造

```
apps/desktop/
├── src/
│   ├── main/              # Electronメインプロセス
│   │   ├── index.ts       # エントリーポイント
│   │   └── window.ts      # ウィンドウ管理
│   ├── preload/           # Preloadスクリプト
│   │   └── index.ts       # ContextBridge設定
│   ├── renderer/          # Reactレンダラープロセス
│   │   ├── index.html     # HTMLエントリーポイント
│   │   ├── main.tsx       # Reactエントリーポイント
│   │   ├── App.tsx        # ルートコンポーネント
│   │   └── styles/        # Tailwind CSS
│   └── shared/            # 共通型定義
│       └── types.ts
├── resources/             # アプリケーションリソース
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

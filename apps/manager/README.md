# @tumiki/manager

Tumiki プロジェクトのメインアプリケーションです。Next.js 15 と App Router を使用して構築された、MCP（Model Context Protocol）サーバー管理プラットフォームを提供します。

## 特徴

- 🚀 **Next.js 15 + App Router** - 最新のNext.jsアーキテクチャによる高速なパフォーマンス
- 🔐 **Keycloak認証** - セキュアなユーザー認証とセッション管理
- 🛠️ **MCPサーバー管理** - MCPサーバーの追加、設定、削除、ステータス管理
- 📊 **リアルタイム分析** - MCPサーバーの利用状況とパフォーマンス分析
- 🎨 **モダンUI** - Tailwind CSS + shadcn/ui による美しいインターフェース
- 🌐 **多言語対応** - 日本語と英語のランディングページ
- 🏢 **マルチテナント** - 組織単位でのリソース管理とアクセス制御
- 💬 **AIチャット機能** - Vercel AI SDKを使用したチャットインターフェース

## インストール

```bash
pnpm install
```

## 使用方法

### 開発サーバーの起動

```bash
# 開発環境の起動（HTTPS + Turbopack）
pnpm dev

# プロダクションビルド
pnpm build

# プロダクションサーバーの起動
pnpm start

# プレビュー（ビルド + 起動）
pnpm preview
```

### 環境変数の設定

プロジェクトルートの `.env` ファイルに以下の環境変数を設定してください：

```env
# Keycloak
KEYCLOAK_CLIENT_ID=
KEYCLOAK_CLIENT_SECRET=
KEYCLOAK_ISSUER=

# Database
DATABASE_URL=

# Vercel
VERCEL_URL=

# その他
NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

## 主要機能

### MCPサーバー管理

- **公式サーバー**: 事前定義されたMCPサーバーの一覧表示と追加
- **カスタムサーバー**: ユーザー独自のMCPサーバーの作成と管理
- **ツールグループ**: 複数のツールをグループ化して管理
- **接続設定**: 環境変数、OAuth認証、APIキーの設定

### 分析機能

- **リクエストログ**: MCPサーバーへのリクエスト履歴
- **パフォーマンス統計**: レスポンス時間、成功率、エラー率
- **使用状況分析**: ツール使用頻度、時系列データ

### 組織管理

- **メンバー管理**: 組織メンバーの招待と権限設定
- **ロール管理**: カスタムロールの作成と権限設定
- **リソース制御**: リソースごとのアクセス制御

## ディレクトリ構造

```text
apps/manager/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (auth)/          # 認証が必要なページ
│   │   ├── (chat)/          # チャット機能
│   │   ├── (lp)/            # ランディングページ
│   │   └── api/             # APIルート
│   ├── components/          # 共通コンポーネント
│   ├── server/              # サーバーサイドロジック
│   │   └── api/             # tRPCルーター
│   ├── hooks/               # カスタムフック
│   ├── lib/                 # ユーティリティ関数
│   ├── constants/           # 定数定義
│   └── types/               # 型定義
├── public/                  # 静的ファイル
└── styles/                  # グローバルスタイル
```

## 開発コマンド

```bash
# 型チェック
pnpm typecheck

# Lint
pnpm lint
pnpm lint:fix

# フォーマット
pnpm format

# 品質チェック（lint + format + typecheck）
pnpm check

# クリーンアップ
pnpm clean
```

## 技術スタック

### フレームワーク・ライブラリ

- **Next.js 15**: App Router、Server Components、Server Actions
- **React 19**: 最新のReact機能
- **TypeScript**: 型安全な開発
- **tRPC**: 型安全なAPI通信
- **Tailwind CSS**: ユーティリティファーストCSS
- **shadcn/ui**: 再利用可能なUIコンポーネント

### 認証・セキュリティ

- **Keycloak**: 認証プロバイダー
- **@auth/prisma-adapter**: Prismaとの統合

### AI・チャット

- **Vercel AI SDK**: AIチャット機能
- **@ai-sdk/xai**: XAI統合

### データベース・状態管理

- **Prisma**: ORMとデータベース管理
- **Redis**: セッション管理とキャッシュ
- **Jotai**: グローバル状態管理

### 開発ツール

- **Turbopack**: 高速な開発サーバー
- **ESLint**: コード品質管理
- **Prettier**: コードフォーマット

## API エンドポイント

### tRPC ルーター

- `/api/trpc/mcpServer.*` - MCPサーバー管理
- `/api/trpc/userMcpServerConfig.*` - ユーザー設定管理
- `/api/trpc/userMcpServerInstance.*` - サーバーインスタンス管理
- `/api/trpc/organization.*` - 組織管理
- `/api/trpc/oauth.*` - OAuth接続管理

### REST API

- `/api/chat` - AIチャット
- `/api/document` - ドキュメント管理

## セキュリティ

- Keycloakによる認証
- JWTトークンベースのセッション管理
- 環境変数の暗号化
- CORS設定
- CSRFトークン保護

## パフォーマンス最適化

- Server Componentsによるサーバーサイドレンダリング
- Turbopackによる高速な開発体験
- 画像最適化（next/image）
- 動的インポートによるコード分割
- Redis キャッシュの活用

## トラブルシューティング

### 開発サーバーが起動しない

```bash
# 依存関係の再インストール
pnpm install

# キャッシュのクリア
pnpm clean
```

### Keycloak認証エラー

- Keycloakでリダイレクト URIが設定されているか確認
- 環境変数が正しく設定されているか確認
- `KEYCLOAK_CLIENT_SECRET`が設定されているか確認

### データベース接続エラー

- `DATABASE_URL`が正しく設定されているか確認
- データベースが起動しているか確認
- マイグレーションが実行されているか確認

## 注意事項

- 開発環境では `http://localhost:3000` でアクセスしてください
- プロダクション環境では環境変数を適切に設定してください
- MCPサーバーの設定変更後は、サーバーの再起動が必要な場合があります

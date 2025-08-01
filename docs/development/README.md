# 開発ガイドドキュメント

このディレクトリには、Tumiki MCP Managerの開発に必要な手順書と実装ガイドが含まれています。

## 📂 ドキュメント一覧

### MCP サーバー開発

- [adding-mcp-server.md](./adding-mcp-server.md) - 新しいMCPサーバーの追加手順
  - MCPサーバー定義の作成
  - ツールの登録
  - テスト方法
  - デプロイ手順

### 外部サービス統合

- [stripe-setup.md](./stripe-setup.md) - Stripe決済の設定ガイド
  - アカウント設定
  - Webhook設定
  - 料金プランの設定
  - テスト環境の構築

- [stripe-integration-implementation-plan.md](./stripe-integration-implementation-plan.md) - Stripe統合の実装計画
  - 実装スケジュール
  - 技術要件
  - セキュリティ考慮事項

### 環境管理

- [vercel-env-management.md](./vercel-env-management.md) - Vercel環境変数の管理
  - 環境変数の設定方法
  - シークレット管理
  - 環境別の設定
  - CI/CDとの連携

## 🛠️ 開発環境セットアップ

### 前提条件

- Node.js >= 22.14.0
- pnpm >= 10.11.0
- PostgreSQL >= 14
- Docker（オプション）

### 初期セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/your-org/tumiki.git
cd tumiki

# 依存関係のインストール
pnpm install

# 環境変数の設定
cp .env.example .env
# .envファイルを編集

# データベースのセットアップ
pnpm db:setup

# 開発サーバーの起動
pnpm dev
```

## 📋 開発フロー

### 1. ブランチ戦略

```
main
├── develop
│   ├── feature/add-oauth-provider
│   ├── feature/improve-performance
│   └── fix/auth-bug
```

### 2. コミット規約

```
feat: 新機能の追加
fix: バグ修正
docs: ドキュメントのみの変更
style: コードの意味に影響しない変更
refactor: バグ修正や機能追加を含まないコード変更
perf: パフォーマンス改善
test: テストの追加・修正
chore: ビルドプロセスやツールの変更
```

### 3. プルリクエスト

- 必ずレビューを受ける
- CIが全て通過していることを確認
- テストカバレッジを維持

## 🧪 テスト

### ユニットテスト

```bash
# 全テスト実行
pnpm test

# 特定のパッケージのテスト
pnpm test --filter @tumiki/auth

# カバレッジ付き
pnpm test:coverage
```

### E2Eテスト

```bash
# Playwright E2Eテスト
pnpm test:e2e
```

## 📝 コーディング規約

### TypeScript

- strictモードを有効化
- 型定義は明示的に
- anyの使用は禁止

### React

- 関数コンポーネントを使用
- カスタムフックで状態ロジックを分離
- メモ化を適切に使用

### スタイリング

- Tailwind CSSを使用
- カスタムCSSは最小限に
- レスポンシブデザイン必須

## 🔗 関連ドキュメント

- [アーキテクチャ設計](../architecture/README.md)
- [運用ガイド](../operations/README.md)
- [セキュリティガイド](../security/README.md)
# タスク完了時のチェックリスト

## 必須実行コマンド（順番に実行）

### 1. コードフォーマット
```bash
pnpm format:fix
```
- Prettierによる自動フォーマット
- コードスタイルの統一

### 2. Lintエラー修正
```bash
pnpm lint:fix
```
- ESLintエラーの自動修正
- コード品質の確保

### 3. 型チェック
```bash
pnpm typecheck
```
- TypeScript型エラーの検出
- 型安全性の確認

### 4. ビルド確認
```bash
pnpm build
```
- 全パッケージのビルド成功確認
- 本番ビルドの検証

### 5. テスト実行
```bash
pnpm test
```
- 全テストの実行
- 既存機能の動作確認

### 6. テストカバレッジ確認（新規コード追加時）
```bash
pnpm test:coverage
```
- 実装ロジックのカバレッジ100%を目標
- カバレッジレポートの確認

## 追加確認事項

### ドキュメント更新
- README.mdの更新（新機能追加時）
- CLAUDE.mdの更新（開発ガイドライン変更時）
- 関連ドキュメントの整合性確認

### ProxyServer関連（該当する場合）
- PM2での動作確認
- MCPサーバー統合テストの実行

### データベース変更（該当する場合）
```bash
cd packages/db
pnpm db:generate  # Prismaクライアント再生成
pnpm db:migrate   # マイグレーション実行
```

### 環境変数（新規追加時）
- `.env`ファイルへの追加
- `.env.example`の更新
- Vercel環境変数の設定確認

## CI/CD確認
- GitHub ActionsでのCI通過を確認
- プルリクエスト作成時の自動チェック

## 簡易実行（並列チェック）
```bash
# lint、format、typecheckを並列実行
pnpm check
```

## 注意事項
- CI環境変数エラーは開発時は無視可能
- `@tumiki/`パッケージのimportエラー時は該当パッケージのビルドが必要
- コミット前に必ず上記チェックを実行すること
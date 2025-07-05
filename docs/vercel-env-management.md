# Vercel 環境変数管理

開発環境の環境変数をVercelで管理するためのガイドです。

## 概要

このプロジェクトでは、環境変数をVercelで一元管理しています。これにより、チーム全体で環境変数を安全に共有し、一貫した設定管理を行うことができます。

## 前提条件

### 必須ツール

- **Vercel CLI** がインストール済み

  ```bash
  # インストール
  npm install -g vercel

  # 認証
  vercel login

  # プロジェクトリンク（プロジェクトルートで実行）
  vercel link
  ```

## 環境変数の設定

### 1. Vercel環境変数の追加

Vercelダッシュボードまたはコマンドラインで環境変数を設定します：

```bash
# 環境変数を追加
vercel env add DATABASE_URL
vercel env add NODE_ENV
vercel env add PORT

# 環境変数の確認
vercel env ls
```

## 使用方法

### 環境変数の取得

```bash
# プロジェクトルートで実行
pnpm env:pull
```

このコマンドは `apps/proxyServer/.env` ファイルを作成し、Vercelから環境変数を取得します。

### 環境変数の一括追加

.envファイルの内容をVercelの開発環境に一括で追加できます：

```bash
# プロジェクトルートで実行

# ルートの.envファイルを開発環境に追加
pnpm env:push

# カスタムファイルを指定
bash scripts/vercel-env-push.sh apps/proxyServer/.env
```

#### 📝 動作について

- **既存の環境変数は上書きしません**: 同じキーの環境変数が既に存在する場合はスキップされます
- **開発環境のみ**: このスクリプトは開発環境 (development) にのみ環境変数を追加します
- **安全な操作**: 既存の環境変数を保護し、新しい環境変数のみを追加します

#### 使用方法

```bash
# 現在の開発環境の環境変数を確認（任意）
vercel env ls development

# 環境変数を追加
pnpm env:push

# 追加結果を確認
vercel env ls development
```

## 開発ワークフロー

### 1. 初回セットアップ

```bash
# 1. プロジェクトをVercelにリンク（未実施の場合）
vercel link

# 2. ローカルの.envファイルをVercelの開発環境に追加
pnpm env:push

# 3. 環境変数を取得（ProxyServer用）
pnpm env:pull

# 4. 開発開始
pnpm dev
```

### 2. 日常的な開発

```bash
# 環境変数を最新に更新
pnpm env:pull

# 開発サーバー起動
pnpm dev
```

### 3. 環境変数の更新

新しい環境変数を追加した場合：

```bash
# .envファイルを編集後、Vercelに反映
pnpm env:push

# 最新の環境変数を取得
pnpm env:pull

# アプリケーションを再起動
pnpm dev
```

## 環境変数の管理

### 機密情報の管理

- 環境変数ファイル（`.env`）は `.gitignore` に追加済み
- Vercelアカウントのセキュリティを確保してください
- 環境変数には機密情報（APIキー、データベース接続文字列など）が含まれます

## トラブルシューティング

### よくある問題と解決方法

#### 1. Vercel認証エラー

```bash
# Vercel認証確認
vercel whoami

# 認証が必要な場合
vercel login
```

#### 2. プロジェクトリンクエラー

```bash
# プロジェクトリンク確認
ls -la .vercel/project.json

# リンクが必要な場合
vercel link
```

#### 3. 環境変数取得エラー

```bash
# 手動で環境変数を確認
vercel env ls

# 特定の環境変数を確認
vercel env ls | grep DATABASE_URL
```

#### 4. 権限エラー

```bash
# Vercelプロジェクトのアクセス権限を確認
# Vercelダッシュボードで確認してください
```

### エラーメッセージの対処法

- `No project found`: プロジェクトがリンクされていません → `vercel link`
- `No environment variables found`: 環境変数が設定されていません → Vercelダッシュボードで設定
- `Authentication required`: 認証が必要です → `vercel login`

## セキュリティ注意事項

1. **アクセス制御**: Vercelプロジェクトのアクセス権限を適切に設定してください
2. **環境変数の保護**: 機密情報を含む環境変数ファイルは共有しないでください
3. **認証情報**: Vercelアカウントのセキュリティを確保してください
4. **定期的な更新**: 環境変数を定期的に見直し、不要なものは削除してください

## 関連ドキュメント

- [ProxyServer デプロイガイド](./proxy-server-deployment.md)
- [Vercel公式ドキュメント](https://vercel.com/docs/cli/env)
- [環境変数のベストプラクティス](https://12factor.net/config)

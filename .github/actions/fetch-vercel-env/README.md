# Fetch Vercel Environment Variables Action

Vercelから環境変数を取得して `.env` ファイルに保存する再利用可能なComposite Actionです。

## 概要

このアクションは、Vercel CLIの `vercel env pull` コマンドを使用して、指定された環境の環境変数を取得し、ローカルファイルに保存します。Cloud Runやその他のCI/CDパイプラインで環境変数を共有する際に便利です。

## パフォーマンス最適化

- **キャッシュ機能**: 同じワークフロー実行内で環境変数を取得した場合、2回目以降はキャッシュから復元されます
- **効率的**: 複数のジョブで同じ環境変数を使用する場合、Vercel APIへの呼び出しは最初の1回のみ
- **セキュリティ**: キャッシュは同じワークフロー実行内でのみ有効（`github.run_id`ベース）

## 使用方法

### 基本的な使用例

```yaml
- name: Vercel環境変数を取得
  uses: ./.github/actions/fetch-vercel-env
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    environment: production
    output-file: .env.production.local
```

### カスタム出力ファイルを指定

```yaml
- name: Preview環境の環境変数を取得
  uses: ./.github/actions/fetch-vercel-env
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    environment: preview
    output-file: .env.preview
```

### デフォルトの出力ファイルを使用

```yaml
- name: 環境変数を取得（デフォルトの.env.localに保存）
  uses: ./.github/actions/fetch-vercel-env
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    environment: production
    # output-fileを省略すると .env.local が使用される
```

## インプット

| 名前 | 必須 | デフォルト | 説明 |
|------|------|------------|------|
| `vercel-token` | ✅ | - | Vercel APIトークン。GitHubのSecretsに保存することを推奨 |
| `environment` | ✅ | - | 取得する環境名（`preview`, `production`など） |
| `output-file` | ❌ | `.env.local` | 環境変数を保存するファイルのパス |

## アウトプット

| 名前 | 説明 |
|------|------|
| `env-file` | 作成された環境変数ファイルのパス |

## 前提条件

- プロジェクトの`package.json`の`devDependencies`に`vercel`が含まれている必要があります
- `pnpm install`が実行済みである必要があります（`.github/actions/setup`で自動実行）
- Vercel APIトークンが必要です（Vercelダッシュボードから取得）

このアクションは`pnpm exec vercel`を使用するため、グローバルインストールは不要です。

## エラーハンドリング

このアクションは以下の場合にエラーで終了します：

- `vercel env pull` コマンドが失敗した場合
- 環境変数ファイルが正常に作成されなかった場合

エラーが発生した場合、詳細なエラーメッセージが表示されます。

## セキュリティ上の注意

- Vercel APIトークンは必ずGitHub Secretsに保存してください
- 環境変数ファイルには機密情報が含まれる可能性があるため、使用後は適切に削除してください
- 環境変数の内容はログに出力されません

## 関連リンク

- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

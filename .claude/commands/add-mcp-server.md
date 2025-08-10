---
allowed-tools: Bash, Read, Edit, Write, Glob, WebFetch
description: "新しいMCPサーバーをTumikiシステムに追加する自動化コマンド"
---

指定されたMCPサーバーをTumikiシステムに統合します。GitHubリポジトリのURLまたはnpmパッケージ名を指定して、必要な設定とファイルを自動で追加します。

## 実行手順

1. **MCPサーバー情報の取得**

   - GitHubリポジトリのURLからパッケージ情報を取得
   - READMEから実行方法、環境変数、機能を解析
   - npmパッケージ名、実行コマンド、引数を特定

2. **依存関係の追加**

   - `packages/scripts/package.json` にパッケージを追加
   - `apps/proxyServer/package.json` にパッケージを追加
   - 両方の場所で `pnpm add` を実行

3. **サーバー定義の追加**

   - `packages/scripts/src/constants/mcpServers.ts` を更新
   - サーバー名、アイコンパス、実行コマンド、環境変数を設定
   - パッケージ構造に基づいて適切な引数を自動設定
   - 環境変数は args 内での置換と子プロセスへの env 設定の両方で利用

4. **ロゴファイルの作成**

   - サーバー名に基づいてSVGロゴを生成
   - `apps/manager/public/logos/` に配置
   - 既存のロゴがある場合はスキップ

5. **データベースへの反映**
   - `pnpm upsertAll` を実行してMCPサーバーをデータベースに登録
   - ツール情報の取得と登録

## 使用例

```bash
# DeepL MCP サーバーを追加
/add-mcp-server https://github.com/DeepLcom/deepl-mcp-server

# GitHubリポジトリから追加
/add-mcp-server https://github.com/eyaltoledano/claude-task-master

# npmパッケージ名で追加
/add-mcp-server task-master-ai "Task Master AI"

# 環境変数を指定して追加
/add-mcp-server figma-developer-mcp "Figma Context" --env FIGMA_API_KEY

# カスタムコマンドと引数を指定
/add-mcp-server my-mcp-server "My Server" --command npx --args "my-mcp-server --stdio"
```

## パラメータ

- `repository_or_package`: GitHubリポジトリURL または npmパッケージ名 (必須)
- `server_name`: サーバーの表示名 (省略時はパッケージ名から生成)
- `--env`: 必要な環境変数をカンマ区切りで指定
- `--command`: 実行コマンド (デフォルト: "node")
- `--args`: コマンド引数をカンマ区切りで指定
- `--icon`: カスタムアイコンパス

## 自動判定ロジック

### パッケージ構造の判定

- `dist/index.js` の存在確認
- `cli.js`, `index.js` の確認
- `package.json` のmainフィールド確認

### 環境変数の判定

- READMEから環境変数の記述を抽出
- 一般的なパターン（API_KEY, TOKEN等）を検出
- 環境変数は実行時に以下の2つの方法で利用：
  1. args 内の文字列置換（例: `--api-key=API_KEY` → `--api-key=実際の値`）
  2. 子プロセスの環境変数として設定（`process.env.API_KEY` でアクセス可能）

### アイコンの自動生成

- サーバー名からカテゴリを推測
- 既知のサービス（GitHub, Notion等）は専用アイコン
- 不明な場合は汎用的なアイコンを生成

## 出力フォーマット

```markdown
🚀 MCPサーバー追加を開始しています...

📦 Step 1: 依存関係の追加
✅ packages/scripts に task-master-ai@^0.18.0 を追加完了
✅ apps/proxyServer に task-master-ai@^0.18.0 を追加完了

⚙️ Step 2: サーバー定義の追加
✅ mcpServers.ts に "Task Master AI" を追加完了

🎨 Step 3: ロゴファイルの作成
✅ /logos/task-master.svg を作成完了

💾 Step 4: データベースへの反映
✅ upsertAll 実行完了
✅ 9個の環境変数設定が利用可能

🎉 MCPサーバー "Task Master AI" の追加が完了しました！

📋 追加されたサーバー情報:

- パッケージ: task-master-ai@^0.18.0
- 実行コマンド: node node_modules/task-master-ai/index.js
- 環境変数: ANTHROPIC_API_KEY, OPENAI_API_KEY など9つ
- アイコン: /logos/task-master.svg
```

## エラーハンドリング

- パッケージが見つからない場合は適切なメッセージを表示
- 既に追加済みのサーバーの場合は更新を提案
- 権限エラーやネットワークエラーに対する適切な対応
- 失敗した場合のロールバック手順を提供

## 前提条件

- pnpm がインストールされていること
- packages/scripts と apps/proxyServer ディレクトリが存在すること
- データベースが適切に設定されていること
- 必要な権限を持っていること

## 注意事項

- 追加したMCPサーバーは即座に利用可能になります
- 環境変数は後からダッシュボードで設定する必要があります
- ロゴファイルは必要に応じて手動で調整してください
- セキュリティの観点から、信頼できるソースからのみ追加してください

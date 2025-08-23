# Container Use を Claude Code で利用する方法

## Container Use とは

Container Use は、AIエージェント（Claude Code、Cursor、VSCodeなど）に独立したサンドボックス開発環境を提供するツールです。各エージェントが独自のコンテナとGitブランチで安全に並列作業できます。

## 主な機能

- **サンドボックス環境**: 各エージェントが独立したコンテナで作業
- **並列実行**: 複数のエージェントが競合なく同時実行可能
- **リアルタイム監視**: コマンド履歴とログの完全な可視性
- **直接介入**: エージェントのターミナルへのアクセスと制御

## セットアップ方法

### 1. MCP サーバーとして Container Use を設定

Claude Code の MCP 設定ファイル（`~/.config/claude/mcp_settings.json`）に以下を追加：

```json
{
  "mcpServers": {
    "container-use": {
      "command": "container-use",
      "args": ["stdio"],
      "env": {}
    }
  }
}
```

単一テナントモードを使用する場合：
```json
{
  "mcpServers": {
    "container-use": {
      "command": "container-use",
      "args": ["stdio", "--single-tenant"],
      "env": {}
    }
  }
}
```

### 2. プロジェクト固有の設定（オプション）

必要に応じて Container Use の設定をカスタマイズ：

```bash
# 設定の確認
container-use config show

# 設定の変更例
container-use config set base-image node:22-alpine
container-use config add setup-command "apt-get update && apt-get install -y git"
container-use config add install-command "npm install -g pnpm"
container-use config set workdir /app
```

## 基本的な使用方法

### 環境の管理

```bash
# 環境一覧を表示
container-use list

# 環境の活動をリアルタイムで監視
container-use watch

# 特定の環境のターミナルにアクセス
container-use terminal <env-id>

# エージェントの実行履歴を確認
container-use log <env-id>
```

### コードの確認と統合

```bash
# 環境での変更内容を確認
container-use diff <env-id>

# 環境の作業を現在のブランチにステージング（変更を確認後）
container-use apply <env-id>

# 環境の作業を現在のブランチにマージ
container-use merge <env-id>

# 環境のブランチにローカルで切り替え
container-use checkout <env-id>
```

### クリーンアップ

```bash
# 特定の環境を削除
container-use delete <env-id>

# 複数の環境を一度に削除
container-use delete <env-id-1> <env-id-2> <env-id-3>
```

## tumiki-oauth プロジェクトでの推奨設定

このプロジェクトに最適な Container Use 設定：

```bash
# Node.js 22 ベースイメージを使用
container-use config set base-image node:22

# pnpm のインストール
container-use config add setup-command "npm install -g pnpm@10.11.0"

# 作業ディレクトリの設定
container-use config set workdir /workdir

# 環境変数の設定（必要に応じて）
container-use config add env NODE_ENV=development
```

## ワークフロー例

### 1. 新機能の開発

```bash
# Claude Code で新機能を開発（自動的に新しい環境が作成される）
# 開発中...

# 環境一覧で作成された環境を確認
container-use list

# 変更内容を確認
container-use diff <env-id>

# 問題なければマージ
container-use merge <env-id>
```

### 2. 並列タスクの実行

複数のClaude Codeセッションで異なるタスクを同時実行：
- セッション1: バグ修正
- セッション2: 新機能開発
- セッション3: テスト作成

各セッションが独立した環境で作業するため、競合なく並列実行可能。

### 3. 実験的な変更

```bash
# 実験的な変更を試す
# Claude Code で作業...

# うまくいかなかった場合は環境を削除
container-use delete <env-id>

# 成功した場合はマージ
container-use merge <env-id>
```

## トラブルシューティング

### エージェントが詰まった場合

```bash
# ターミナルにアクセスして状況を確認
container-use terminal <env-id>

# ログを確認
container-use log <env-id>
```

### MCP サーバーが起動しない場合

1. Container Use がインストールされているか確認：
   ```bash
   which container-use
   ```

2. MCP 設定ファイルのパスと内容を確認：
   ```bash
   cat ~/.config/claude/mcp_settings.json
   ```

3. Container Use を手動で起動してテスト：
   ```bash
   container-use stdio
   ```

## ベストプラクティス

1. **定期的なクリーンアップ**: 不要な環境は `container-use delete` で削除
2. **変更の確認**: `merge` 前に必ず `diff` で変更内容を確認
3. **監視の活用**: `watch` コマンドで複数環境の活動を監視
4. **ブランチ戦略**: 各環境が独自のGitブランチを持つことを活用
5. **設定の最適化**: プロジェクトに合わせた base-image と setup-command の設定

## 参考リンク

- [Container Use 公式サイト](https://container-use.com)
- [GitHub リポジトリ](https://github.com/container-use/container-use)
- [Discord サポート](https://discord.gg/container-use)
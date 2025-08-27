# Python MCP サーバーのセットアップガイド

Tumiki では Node.js ベースの MCP サーバーに加えて、Python ベースの MCP サーバーもサポートしています。このドキュメントでは、Python MCP サーバーの環境構築と設定方法について説明します。

## 前提条件

### 必要なソフトウェア

- **Python**: 3.10 以上
- **uv**: 高速な Python パッケージマネージャーおよびツール実行環境

## 環境構築

### 1. Python のインストール

#### Windows
```bash
# wingetを使用
winget install Python.Python.3.12

# またはchocolateyを使用
choco install python
```

#### macOS
```bash
# Homebrewを使用
brew install python@3.12
```

#### Linux
```bash
# Ubuntuの場合
sudo apt update
sudo apt install python3.12 python3-pip
```

### 2. uv のインストール

uv は Rust で書かれた高速な Python パッケージマネージャーです。Python MCP サーバーのインストールと管理が容易になります。

```bash
# Windows (winget)
winget install astral.uv

# macOS (Homebrew)
brew install uv

# Linux/macOS (curl)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

## Python MCP サーバーの追加方法

### 1. PyPI パッケージの場合

```bash
# uvを使用してツールとしてインストール
uv tool install <package-name>

# 例: Google Analytics MCP
uv tool install analytics-mcp
```

### 2. GitHubリポジトリから直接インストール

```bash
# uvを使用してGitHubから直接インストール
uv tool install git+https://github.com/<user>/<repo>.git

# 例
uv tool install git+https://github.com/googleanalytics/google-analytics-mcp.git
```

### 3. ローカル開発の場合

```bash
# リポジトリをクローン
git clone https://github.com/<user>/<repo>.git
cd <repo>

# 開発モードでインストール
pip install -e .

# またはuvを使用
uv pip install -e .
```

## Tumiki での Python MCP サーバーの設定

### mcpServers.ts での設定例

```typescript
{
  name: "Google Analytics",
  command: "uvx",
  args: ["analytics-mcp"],
  description: "Google Analytics データへのアクセスと分析を行うMCPサーバー",
  // または、直接実行コマンドを指定
  command: "analytics-mcp",
  args: [],
}
```

### 環境変数の設定

Python MCP サーバーは通常、以下の方法で環境変数を使用します：

1. **システム環境変数**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
   export GOOGLE_PROJECT_ID="your-project-id"
   ```

2. **.env ファイル**
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
   GOOGLE_PROJECT_ID=your-project-id
   ```

3. **Tumiki の環境変数設定**
   - ダッシュボードから各 MCP サーバーの環境変数を設定
   - プロキシサーバーが自動的に環境変数を渡す

## Python MCP サーバーの実行確認

### 1. コマンドラインでの確認

```bash
# インストール済みツールの確認
uv tool list

# MCP サーバーの直接実行テスト
uvx <package-name> --help

# 例: Google Analytics MCP
uvx analytics-mcp --help
```

### 2. 依存関係の確認

```bash
# パッケージの依存関係を確認
uv tool run --from <package-name> pip list

# 例
uv tool run --from analytics-mcp pip list
```

## トラブルシューティング

### 1. Python バージョンの問題

```bash
# Pythonバージョンの確認
python --version
python3 --version

# 特定バージョンのPythonを使用
uv tool install --python python3.12 <package-name>
```

### 2. パスの問題

```bash
# uvのパスを確認
which uvx

# 手動でパスを追加（bash/zshの場合）
echo 'export PATH="$PATH:$HOME/.local/bin"' >> ~/.bashrc
source ~/.bashrc
```

### 3. 権限の問題

```bash
# Windows管理者権限で実行
# PowerShellを管理者として開いて実行

# Linux/macOSでsudoが必要な場合
sudo uv tool install <package-name>
```

### 4. 仮想環境の競合

```bash
# 既存の仮想環境を無効化
deactivate

# uvの環境を再作成
uv tool uninstall <package-name>
uv tool install <package-name>
```

## Python MCP サーバーの開発

### 基本的なプロジェクト構造

```
my-mcp-server/
├── pyproject.toml          # プロジェクト設定
├── README.md              # ドキュメント
├── src/
│   └── my_mcp_server/
│       ├── __init__.py
│       └── server.py      # MCP サーバー実装
└── tests/                 # テスト
```

### pyproject.toml の例

```toml
[project]
name = "my-mcp-server"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
    "mcp[cli]",
    "httpx",
]

[project.scripts]
my-mcp-server = "my_mcp_server.server:run_server"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

### 最小限の MCP サーバー実装

```python
# src/my_mcp_server/server.py
import asyncio
from mcp import Server, Tool
from mcp.server import stdio_server

app = Server("my-mcp-server")

@app.tool()
async def hello_world(name: str) -> str:
    """Say hello to someone"""
    return f"Hello, {name}!"

async def run_server():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream=read_stream,
            write_stream=write_stream,
            initializer=None,
        )

def main():
    asyncio.run(run_server())

if __name__ == "__main__":
    main()
```

## ベストプラクティス

1. **uv の使用**: グローバル Python 環境を汚染しないよう、常に uv tool を使用
2. **バージョン管理**: pyproject.toml で Python とパッケージのバージョンを明示
3. **環境変数**: 機密情報は環境変数で管理し、コードにハードコーディングしない
4. **エラーハンドリング**: 適切なエラーメッセージとロギングを実装
5. **テスト**: pytest を使用した単体テストを作成
6. **ドキュメント**: README に環境構築と使用方法を明記

## 関連リソース

- [MCP Python SDK Documentation](https://github.com/modelcontextprotocol/python-sdk)
- [uv Documentation](https://docs.astral.sh/uv/)
- [Python Packaging User Guide](https://packaging.python.org/)

## サポートされている Python MCP サーバー

現在 Tumiki でサポートされている Python ベースの MCP サーバー：

- **analytics-mcp**: Google Analytics データアクセス
- **browserbase-mcp**: ブラウザ自動化
- **cerebras-mcp**: Cerebras AI プラットフォーム連携
- その他、PyPI で公開されている MCP サーバー

## 注意事項

- Python MCP サーバーは Node.js サーバーよりも起動時間が長い場合があります
- Windows では Python のパス設定に注意が必要です
- 一部の Python パッケージはプラットフォーム固有の依存関係を持つ場合があります
- Docker 環境での実行時は、Python イメージのサイズに注意してください
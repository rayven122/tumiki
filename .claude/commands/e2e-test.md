---
allowed-tools: Task, Bash, Read, Write, Glob
description: "tumikiプロジェクトの包括的なE2Eテストを実行し、サービスエンドポイント検証とブラウザテストを行います"
---

# E2Eテストコマンド

指定されたスコープに基づいてtumikiアプリケーションのE2Eテストを実行します。e2e-test-runnerエージェントを活用して、Playwright MCPによる自動化テストとエンドポイント検証を行います。

## 実行手順

1. **テスト環境の準備確認**
   - 開発サーバーが起動していることを確認 (`pnpm dev`)
   - 必要な環境変数が設定されていることを確認
   - Playwright MCPが利用可能であることを確認

2. **e2e-test-runnerエージェントの起動**
   - Taskツールを使用してe2e-test-runnerエージェントを呼び出し
   - 指定されたテストスコープに基づいてテストを実行

3. **テスト結果の収集と報告**
   - エージェントからの結果を整理
   - わかりやすいレポート形式で表示

## 使用例

```bash
# 基本的な疎通確認テスト
/e2e-test smoke

# 全機能の包括的テスト
/e2e-test full

# エンドポイントのみの検証
/e2e-test endpoints

# 認証フローのテスト
/e2e-test auth

# MCPサーバー機能のテスト
/e2e-test mcp

# 特定のURLのテスト
/e2e-test http://localhost:3000/jp

# デフォルト（smokeテスト）
/e2e-test
```

## パラメータ

- `test_scope`: テストのスコープまたは対象（省略時は "smoke"）
  - `smoke`: 基本的な疎通確認と主要パスのテスト
  - `full`: すべての機能の包括的テスト
  - `endpoints`: エンドポイントの健全性チェックのみ
  - `auth`: Keycloak認証フローのテスト
  - `mcp`: MCPサーバー設定と管理機能のテスト
  - `<url>`: 特定のURLのテスト

## テスト内容

### Smokeテスト（デフォルト）

- Manager appの起動確認
- Proxy serverのエンドポイント確認
- 基本的なページ遷移
- 認証ページへのアクセス

### Fullテスト

- すべてのエンドポイントの検証
- 認証フローの完全テスト
- MCPサーバー管理機能
- 組織とマルチテナント機能
- APIキー管理
- 英語版と日本語版の両ページ

### エンドポイント検証

- Manager app: `http://localhost:3000`
- Proxy server: `http://localhost:8080`
  - `/mcp` - HTTP/Streamable transport
  - `/sse` - SSE transport
  - `/messages` - SSEメッセージ送信
- tRPC APIルーター

### 認証テスト

- Keycloakログインフロー
- セッション管理
- ロールベースアクセス制御
- ログアウト処理

### MCPテスト

- MCPサーバーの追加と設定
- 環境変数の暗号化確認
- サーバーインスタンスの管理
- ツールの実行確認

## 出力フォーマット

```markdown
🧪 E2Eテストを開始します...
テストスコープ: smoke

📊 テスト環境の確認
✅ Manager app: 起動中 (http://localhost:3000)
✅ Proxy server: 起動中 (http://localhost:8080)
✅ Playwright MCP: 利用可能

🔍 テスト実行中...
[e2e-test-runnerエージェントによる詳細な実行ログ]

📈 テスト結果サマリー
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 成功: 15/18
❌ 失敗: 3/18
⏱️ 実行時間: 45.3秒

📋 詳細結果:
✅ ホームページアクセス (200ms)
✅ /jp ページアクセス (180ms)
✅ /mcp エンドポイント (50ms)
✅ /sse エンドポイント (45ms)
❌ Keycloakログイン - タイムアウト
✅ MCPサーバーリスト表示 (320ms)
...

🎬 記録されたテストスクリプト:

- tests/e2e/smoke-test-2024-01-15.spec.ts
- tests/e2e/endpoint-health-2024-01-15.spec.ts

📊 パフォーマンスメトリクス:

- 平均レスポンス時間: 156ms
- 最遅エンドポイント: /api/trpc/mcpServer.list (520ms)
- ページロード時間: 1.2秒

💡 推奨事項:

- Keycloakの設定を確認してください
- /api/trpc/mcpServer.listのパフォーマンス改善を検討
- テストデータのクリーンアップスクリプトを追加

🎯 テスト完了！
```

## エラーハンドリング

- サービスが起動していない場合は起動手順を案内
- Playwright MCPが利用できない場合は設定手順を表示
- テスト失敗時はスクリーンショットとエラーログを保存
- ネットワークエラーは自動リトライ（最大3回）

## テストスクリプトの保存

実行されたテストは以下の形式で保存されます：

- 場所: `tests/e2e/` ディレクトリ
- 命名規則: `{test-scope}-test-{date}.spec.ts`
- Playwrightのベストプラクティスに従った構造
- 日本語でのテスト名（プロジェクト規約に準拠）

## 前提条件

- Node.js >=22.14.0
- pnpm がインストールされていること
- 開発サーバーが起動可能な状態
- Playwright MCPが設定済み（.mcp.jsonに定義）
- 必要な環境変数が設定されていること

## 注意事項

- テストは開発環境で実行されます
- 本番環境のデータには影響しません
- テスト実行中はブラウザが自動操作されます
- 長時間のテスト（full）は完了まで5-10分かかる場合があります

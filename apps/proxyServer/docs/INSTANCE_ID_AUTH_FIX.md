# Instance ID 認証修正

## 問題の説明

Claude Code が x-api-key ヘッダー認証を使用した MCP Server Instance ID URL に接続できず、401 エラーを受け取っていました。

### 問題

Tumiki プロキシサーバーは、クライアント（Claude Code など）とバックエンドの MCP サーバー間の仲介役として機能します：

```
Claude Code → Tumiki プロキシサーバー → バックエンド MCP サーバー
```

問題の原因：

1. Claude Code は x-api-key ヘッダーで Tumiki プロキシへの認証に成功していました
2. しかし、プロキシがバックエンド MCP サーバー（SSE トランスポート）に接続する際、認証ヘッダーを転送していませんでした
3. 認証が必要なバックエンド MCP サーバーは 401 エラーで接続を拒否していました

## 実装された解決策

### SSE トランスポートの修正

`/apps/proxyServer/src/utils/proxy.ts` を修正し、SSE トランスポート接続にヘッダー転送を追加しました：

1. **環境変数からヘッダーへのマッピング**: 環境変数から認証情報を抽出し、適切なヘッダーにマッピングするロジックを追加：
   - `API_KEY` または `X_API_KEY` → `X-API-Key` ヘッダー
   - `BEARER_TOKEN` または `AUTHORIZATION` → `Authorization: Bearer` ヘッダー
   - `X_*` 環境変数 → 対応するヘッダー

2. **カスタム Fetch 実装**: 認証ヘッダーを含む SSEClientTransport 用のカスタム fetch 関数を作成：

```typescript
const customFetch = async (url: string | URL, init: RequestInit) => {
  const finalInit = {
    ...init,
    headers: {
      ...init.headers,
      ...headers, // Include authentication headers
    },
  };
  return fetch(url, finalInit);
};
```

3. **TransportConfigSSE 型の更新**: 環境変数をサポートするため `env` プロパティを追加：

```typescript
export type TransportConfigSSE = {
  type: "sse";
  url: string;
  env?: Record<string, string>; // 環境変数（認証ヘッダー設定用）
};
```

## テスト

### テストスクリプト

認証修正を検証するため、2つのテストスクリプトを作成しました：

#### 1. Streamable HTTP トランスポートテスト

`scripts/test-instance-id-auth.ts`

StreamableHTTPClientTransport を使用して、x-api-key ヘッダーによる Instance ID URL 認証をテストします。

```bash
# 環境変数を設定してテストを実行
MCP_INSTANCE_ID=your-instance-id TEST_API_KEY=your-api-key pnpm test:instance-id
```

#### 2. SSE トランスポートテスト

`scripts/test-sse-instance-id-auth.ts`

SSEClientTransport を使用して、x-api-key ヘッダーによる Instance ID URL 認証をテストします。

```bash
# 環境変数を設定してテストを実行
MCP_INSTANCE_ID=your-instance-id TEST_API_KEY=your-api-key pnpm test:sse-instance-id
```

### テストプロセス

1. **プロキシサーバーを起動**：

```bash
pnpm start
```

2. **環境変数を設定**：

```bash
export MCP_INSTANCE_ID=your-actual-instance-id
export TEST_API_KEY=your-actual-api-key
export MCP_PROXY_URL=http://localhost:8080
```

3. **テストを実行**：

```bash
# Streamable HTTP トランスポートのテスト
pnpm test:instance-id

# SSE トランスポートのテスト
pnpm test:sse-instance-id
```

### 期待される結果

認証が正常に動作している場合：

- ✅ Instance ID 認証で正常に接続
- ✅ ツールリストを正常に取得
- ✅ ツール呼び出しが実行される（該当する場合）

認証が失敗した場合：

- ❌ 401 Unauthorized エラー
- エラー出力にトラブルシューティングのヒントが表示される

## アーキテクチャ概要

### トランスポートタイプ

プロキシサーバーは2つのレベルのトランスポートをサポートしています：

1. **クライアントからプロキシ**: クライアントが Tumiki に接続する方法
   - Streamable HTTP (`/mcp/{instanceId}`)
   - SSE (`/sse/{instanceId}`)

2. **プロキシからバックエンド**: Tumiki が実際の MCP サーバーに接続する方法
   - STDIO（コマンドラインベース）
   - SSE（認証ヘッダーサポート付き）

### 認証フロー

1. **クライアント認証**: Claude Code が Tumiki プロキシに x-api-key ヘッダーを送信
2. **プロキシ検証**: Tumiki が API キーを検証し、MCP サーバーインスタンスを特定
3. **バックエンド接続**: Tumiki がバックエンド MCP サーバーに接続
   - STDIO の場合: 環境変数をプロセスに渡す
   - SSE の場合: 環境変数からヘッダーを抽出し、HTTP リクエストに含める

## 制限事項

- 現在の修正は SSE トランスポートのバックエンド接続にのみ適用されます
- STDIO トランスポートは環境変数を直接使用します（HTTP ヘッダーは不要）
- バックエンド接続用の HTTP トランスポートタイプは存在しません（SSE と STDIO のみ）

## 今後の改善点

1. 追加の認証方法のサポート（OAuth、JWT）
2. カスタムヘッダーマッピングの設定追加
3. パフォーマンス向上のための接続プーリングの実装
4. すべてのトランスポートの組み合わせに対する包括的な統合テストの追加

# MCPサーバーアイコン仕様調査

## 概要

この文書は、tumikiを経由してClaude DesktopやClaude CodeとMCPサーバーを接続する際に、MCPサーバーごとにアイコン画像を変更する方法についての調査結果をまとめたものです。

**調査日**: 2026年1月31日
**結論**: MCPサーバーごとにアイコンを変更することは**技術的に可能**

## MCPプロトコルのアイコンサポート

### プロトコル仕様

MCPプロトコル（draft版）では、以下の要素にアイコンを設定できます：

| 要素 | 説明 |
|------|------|
| `Implementation` | サーバー実装自体のアイコン（serverInfo） |
| `Tool` | 各ツールのアイコン |
| `Prompt` | プロンプトテンプレートのアイコン |
| `Resource` | リソースのアイコン |

### アイコンのデータ構造

```typescript
interface Icon {
  src: string;        // 必須: アイコンのURL（HTTPS or data: URI）
  mimeType?: string;  // オプション: MIMEタイプ（例: "image/png"）
  sizes?: string[];   // オプション: サイズ指定（例: ["48x48"]）
  theme?: string;     // オプション: テーマ設定（"light" or "dark"）
}

// icons フィールドは配列で複数のアイコンを指定可能
icons?: Icon[];
```

### MCP SDK対応状況

MCP SDK v1.24.0 の `ImplementationSchema` は `icons` フィールドをサポートしています：

```typescript
// apps/mcp-proxy/node_modules/@modelcontextprotocol/sdk/dist/esm/types.d.ts
export declare const ImplementationSchema: z.ZodObject<{
    version: z.ZodString;
    websiteUrl: z.ZodOptional<z.ZodString>;
    icons: z.ZodOptional<z.ZodArray<z.ZodObject<{
        src: z.ZodString;
        mimeType: z.ZodOptional<z.ZodString>;
        sizes: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>>;
    name: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
```

### セキュリティ要件

MCPプロトコル仕様に記載されているセキュリティ要件：

1. **URI制限**: HTTPS または `data:` URI のみ許可。`javascript:`, `file:`, `ftp:`, `ws:` などは拒否
2. **同一オリジン**: アイコンURIはサーバーと同一オリジンであることを推奨
3. **認証なしフェッチ**: アイコン取得時にCookieや認証ヘッダーを送信しない
4. **サイズ制限**: リソース枯渇攻撃を防ぐため、画像サイズ制限を設けることを推奨
5. **MIMEタイプ検証**: マジックバイトでコンテンツタイプを検証し、不一致の場合は拒否

### サポート必須のMIMEタイプ

| MIMEタイプ | 説明 | サポート要件 |
|-----------|------|-------------|
| `image/png` | PNG画像 | **必須** |
| `image/jpeg` / `image/jpg` | JPEG画像 | **必須** |
| `image/svg+xml` | SVG画像 | 推奨（要セキュリティ対策） |
| `image/webp` | WebP画像 | 推奨 |

## Claude Desktop / Claude Code でのアイコン取得

### 現状の挙動

Claude DesktopやClaude Codeは、MCPサーバーのアイコンを以下のいずれかの方法で取得していると推測されます：

1. **MCPプロトコル経由**: `initialize` レスポンスの `serverInfo.icons` を読み取る
2. **ファビコン自動取得**: MCPサーバーのURLからファビコンを自動取得
3. **設定ファイル指定**: `claude_desktop_config.json` での明示指定（未確認）

### 設定ファイルの場所

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Claude Code**: `.mcp.json` または `~/.claude.json`

### 注意事項

- 設定ファイルでのアイコン指定機能は公式ドキュメントに明記されていない
- MCPプロトコルの `icons` フィールドは draft 版の仕様であり、クライアント側の対応状況は実装依存

## tumikiの現状実装

### データベーススキーマ

tumikiのデータベースには既にアイコン用のフィールドが存在します：

```prisma
// packages/db/prisma/schema/mcpServer.prisma
model McpServerTemplate {
  iconPath String?  // MCPサーバーテンプレートのアイコン
  // ...
}

// packages/db/prisma/schema/userMcpServer.prisma
model McpServer {
  iconPath String?  // 作成されたMCPサーバーのアイコン
  // ...
}
```

### mcp-proxy の現状

現在の `serverInfo` レスポンス（`apps/mcp-proxy/src/handlers/mcpHandler.ts:175-178`）:

```typescript
serverInfo: {
  name: "Tumiki MCP Proxy",
  version: "0.1.0",
  // icons フィールドは含まれていない
}
```

### フロントエンドでのアイコン表示

tumikiのマネージャーUIでは、以下の優先順位でアイコンを表示：

1. `iconPath` が指定されている場合 → 直接表示
2. `iconPath` がない場合 → URLからファビコンを自動取得（Google/DuckDuckGo Favicon Service使用）
3. どちらもない場合 → デフォルトアイコン表示

## 実装オプション

### オプション1: serverInfo に icons を追加

`initialize` レスポンスの `serverInfo` に `icons` フィールドを追加：

```typescript
// apps/mcp-proxy/src/handlers/mcpHandler.ts
serverInfo: {
  name: serverName,  // MCPサーバー名
  version: "0.1.0",
  icons: mcpServer.iconPath ? [
    {
      src: mcpServer.iconPath,
      mimeType: "image/png",
      sizes: ["48x48"]
    }
  ] : undefined
}
```

**メリット**:
- MCPプロトコル標準に準拠
- Claude Desktop/Codeが対応していれば自動的に表示される

**デメリット**:
- draft版仕様のためクライアント側の対応が不明
- tumikiは単一プロキシとして動作するため、統合サーバー全体のアイコンになる

### オプション2: ツールレベルでアイコンを設定

各ツールに個別のアイコンを設定：

```typescript
// tools/list レスポンス
{
  tools: [
    {
      name: "github__create_issue",
      description: "Create a new issue",
      icons: [
        {
          src: "https://github.githubassets.com/favicons/favicon.svg",
          mimeType: "image/svg+xml"
        }
      ],
      inputSchema: { ... }
    }
  ]
}
```

**メリット**:
- より細かい制御が可能
- 統合MCPサーバーでもツールごとにアイコンを区別できる

**デメリット**:
- 実装コストが高い
- ツール数が多い場合のパフォーマンス影響

### オプション3: ファビコン自動取得への依存

現状のClaude側のファビコン自動取得機能に依存：

**メリット**:
- 実装変更不要

**デメリット**:
- tumikiのプロキシURLからファビコンが取得されるため、全サーバーが同じアイコンになる
- カスタマイズ不可

## 実装時の検討事項

### 検証が必要な項目

1. **Claude Desktop/Codeの対応状況**: `serverInfo.icons` を読み取ってアイコン表示するか
2. **アイコンURLの要件**: 外部URLが使用可能か、tumikiでホストする必要があるか
3. **キャッシュ挙動**: アイコン変更後の反映タイミング

### データ取得の課題

現在のmcp-proxyでは、`initialize` ハンドラー内でMCPサーバーの詳細情報（iconPath含む）を取得するデータベースアクセスが必要：

```typescript
// 必要な変更イメージ
server.setRequestHandler(InitializeRequestSchema, async () => {
  // MCPサーバー情報をDBから取得
  const mcpServer = await prisma.mcpServer.findUnique({
    where: { id: mcpServerId }
  });

  return {
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    serverInfo: {
      name: mcpServer?.name ?? "Tumiki MCP Proxy",
      version: "0.1.0",
      icons: mcpServer?.iconPath ? [
        { src: mcpServer.iconPath, mimeType: "image/png" }
      ] : undefined
    },
  };
});
```

## 参考資料

- [MCP Tools Specification (draft)](https://modelcontextprotocol.io/specification/draft/server/tools)
- [MCP Basic Specification (draft)](https://modelcontextprotocol.io/specification/draft/basic)
- [Claude Code MCP Documentation](https://code.claude.com/docs/en/mcp)
- [Claude Desktop Local MCP Setup](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2026-01-31 | 初版作成 |

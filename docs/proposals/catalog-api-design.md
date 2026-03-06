# カタログ機能設計書

**作成日**: 2026-03-06
**更新日**: 2026-03-06
**対象リポジトリ**: tumiki (このリポジトリ)
**関連設計書**: `mcp-wrapper-design.md`

---

## 1. 概要

### 1.1 目的

mcp-wrapper が stdio MCP サーバーを動的に起動するために必要な設定情報を管理・提供する。

### 1.2 スコープ

**対象: 環境変数ベースの MCP サーバーのみ**

| 種類 | 対象 | 理由 |
|------|------|------|
| 環境変数ベース | ✅ 対象 | メモリ分離で安全、約 90% の MCP サーバー |
| OAuth/ファイルベース | ❌ 対象外 | ファイルシステム分離が必要、Cloud Run で対応 |

```
サポート例:
├── deepl-mcp-server           (DEEPL_API_KEY)
├── @anthropics/mcp-server-brave-search (BRAVE_API_KEY)
├── @modelcontextprotocol/server-github (GITHUB_TOKEN)
└── 大多数の MCP サーバー

非サポート例:
├── Google Drive (OAuth + credentials.json)
└── → 既存の SSE/HTTPS (Cloud Run) で対応
```

### 1.3 データモデル

**新規テーブル不要 - 既存の `McpServerTemplate` を使用**

```
┌─────────────────────────────────────────────────────────────────────┐
│                    McpServerTemplate（既存）                         │
│                                                                     │
│  mcp-wrapper で使用するフィールド:                                   │
│  ├── normalizedName    → サーバー識別子（例: "deepl"）              │
│  ├── transportType     → STDIO でフィルタ                          │
│  ├── command           → 実行コマンド（例: "npx"）                  │
│  ├── args              → コマンド引数（例: ["-y", "deepl-mcp"]）    │
│  ├── envVarKeys        → 環境変数キー（ヘッダー名と同一）           │
│  └── organizationId    → 公式 or 組織カスタム                       │
│                                                                     │
│  ヘッダー→環境変数の規則:                                            │
│  envVarKeys = ["X-DeepL-API-Key"]                                   │
│  HTTP ヘッダー X-DeepL-API-Key: xxx → 環境変数 X-DeepL-API-Key=xxx  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.4 アーキテクチャ

**Manager と mcp-wrapper が DB を直接参照**（REST API 不要）

```
┌─────────────────────────────────────────────────────────────────────┐
│                        シンプルな構成                                │
│                                                                     │
│   Manager (Next.js)                    mcp-wrapper (Node.js)        │
│   ├── tRPC: CRUD 操作                  ├── DB 直接参照              │
│   └── 管理者 UI                        └── プロセス管理             │
│          │                                    │                     │
│          │                                    │                     │
│          ▼                                    ▼                     │
│   ┌─────────────────────────────────────────────────────────┐      │
│   │                    PostgreSQL                            │      │
│   │                    (McpServerTemplate)                   │      │
│   └─────────────────────────────────────────────────────────┘      │
│                                                                     │
│   ※ 両方とも @tumiki/db を使用、REST API は不要                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

| 機能 | 実装場所 | 方式 |
|------|---------|------|
| CRUD操作 | Manager | tRPC（既存の mcpServer ルーター拡張） |
| 管理者UI | Manager | 既存の `/mcps` ページ拡張 |
| カタログ参照 | mcp-wrapper | **DB 直接参照** |

---

## 2. McpServerTemplate の活用

### 2.1 既存スキーマ（変更不要）

`packages/db/prisma/schema/mcpServer.prisma`

```prisma
model McpServerTemplate {
  id             String              @id @default(cuid())
  name           String              // 表示名
  normalizedName String              // サーバー識別子（URLパスで使用）
  description    String?
  tags           String[]
  iconPath       String?
  transportType  TransportType       @default(STDIO)  // STDIO, SSE, STREAMABLE_HTTPS
  command        String?             // STDIO用コマンド
  args           String[]            // STDIO用引数
  url            String?             // SSE/HTTPS用URL
  envVarKeys     String[]            // 環境変数キー（ヘッダー名と同一）
  authType       AuthType            @default(NONE)
  organizationId String              // 公式: OFFICIAL_ORGANIZATION_ID
  // ...
}
```

### 2.2 mcp-wrapper での参照

```typescript
// apps/mcp-wrapper/src/infrastructure/db/repositories/mcpServerTemplateRepository.ts
import { db, TransportType } from "@tumiki/db/server";

export const getStdioServerByName = async (
  normalizedName: string,
): Promise<McpServerConfig | null> => {
  const template = await db.mcpServerTemplate.findFirst({
    where: {
      normalizedName,
      transportType: TransportType.STDIO,
      organizationId: config.officialOrganizationId,
    },
    select: {
      id: true,
      name: true,
      normalizedName: true,
      command: true,
      args: true,
      envVarKeys: true,
    },
  });

  if (!template?.command) return null;

  return {
    id: template.id,
    name: template.name,
    normalizedName: template.normalizedName,
    command: template.command,
    args: template.args,
    envVarKeys: template.envVarKeys,
  };
};
```

### 2.3 ヘッダー→環境変数変換

`envVarKeys` に指定された名前がそのままヘッダー名＆環境変数名として使用される：

```typescript
// domain/services/envMapper.ts
export const mapHeadersToEnv = (
  headers: Record<string, string | undefined>,
  envVarKeys: readonly string[],
): Record<string, string> => {
  const env: Record<string, string> = {};

  for (const key of envVarKeys) {
    // ヘッダー名は小文字で正規化されている
    const value = headers[key.toLowerCase()];
    if (value) {
      // 環境変数名は envVarKeys そのまま使用
      env[key] = value;
    }
  }

  return env;
};
```

**例:**
- `envVarKeys = ["X-DeepL-API-Key"]`
- HTTP ヘッダー `x-deepl-api-key: xxx`
- → 環境変数 `X-DeepL-API-Key=xxx`

---

## 3. Manager での STDIO テンプレート管理

### 3.1 既存 UI の拡張

現在の Manager UI (`/mcps`) は STDIO サーバーを除外しています：

```tsx
// 現在の実装（ServerList.tsx:35-38）
if (server.transportType === "STDIO") {
  return false;  // STDIO を除外
}
```

**拡張案:**
- STDIO テンプレートを表示するタブ/フィルターを追加
- または別ページ `/mcp-catalog` を作成

### 3.2 STDIO テンプレート登録フォーム

```
┌─────────────────────────────────────────────────────────────────────┐
│  STDIO MCP サーバー登録                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  基本情報                                                           │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 名前 (slug):     [deepl                    ]                  │ │
│  │ 表示名:          [DeepL Translator         ]                  │ │
│  │ 説明:            [DeepL翻訳APIを使用...    ]                  │ │
│  │ タグ:            [翻訳] [言語] [+追加]                        │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  実行設定                                                           │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ コマンド:        [npx                      ]                  │ │
│  │ 引数:            [-y] [deepl-mcp-server] [+追加]              │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  環境変数キー（HTTPヘッダー名と同一）                                │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ [X-DeepL-API-Key                                         ] [×]│ │
│  │ [+ 追加]                                                      │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  ※ ヘッダー名がそのまま環境変数名として使用されます                 │
│                                                                     │
│                                          [キャンセル] [保存]        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. 実装タスク

### Phase 1: mcp-wrapper 実装（完了）

- [x] `apps/mcp-wrapper` 基本実装
- [x] `McpServerTemplate` を参照するリポジトリ
- [x] ProcessPool, McpProcess 実装
- [x] ヘッダー→環境変数変換

### Phase 2: Manager UI 拡張（将来）

- [ ] STDIO テンプレート表示の追加
- [ ] STDIO テンプレート登録フォーム
- [ ] 公式テンプレート（organizationId = official）の管理

### Phase 3: 初期データ投入

- [ ] 公式 STDIO テンプレートの登録（SQL or シード）

---

## 5. 初期データ例

```typescript
// 公式 STDIO テンプレートのシードデータ
const officialStdioTemplates = [
  {
    name: "DeepL Translator",
    normalizedName: "deepl",
    transportType: "STDIO",
    command: "npx",
    args: ["-y", "deepl-mcp-server"],
    envVarKeys: ["X-DeepL-API-Key"],
    tags: ["translation", "language"],
    organizationId: "official-tumiki",
  },
  {
    name: "Brave Search",
    normalizedName: "brave-search",
    transportType: "STDIO",
    command: "npx",
    args: ["-y", "@anthropics/mcp-server-brave-search"],
    envVarKeys: ["X-Brave-API-Key"],
    tags: ["search", "web"],
    organizationId: "official-tumiki",
  },
  {
    name: "GitHub",
    normalizedName: "github",
    transportType: "STDIO",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    envVarKeys: ["X-GitHub-Token"],
    tags: ["git", "development"],
    organizationId: "official-tumiki",
  },
];
```

---

## 6. 組織カスタム対応（将来）

組織ごとのカスタム STDIO テンプレートは `McpServerTemplate.organizationId` で区別：

```typescript
// 検索順序
const getStdioServerByName = async (normalizedName: string, orgId?: string) => {
  // 1. 組織のカスタムテンプレートを優先
  if (orgId) {
    const orgTemplate = await findByNameAndOrg(normalizedName, orgId);
    if (orgTemplate) return orgTemplate;
  }
  // 2. 公式テンプレートにフォールバック
  return findByNameAndOrg(normalizedName, OFFICIAL_ORGANIZATION_ID);
};
```

---

## 7. 参照ドキュメント

| ドキュメント | 場所 |
|-------------|------|
| mcp-wrapper 設計書 | `docs/proposals/mcp-wrapper-design.md` |
| McpServerTemplate スキーマ | `packages/db/prisma/schema/mcpServer.prisma` |
| mcp-proxy アーキテクチャ | `tumiki-mcp-proxy-architecture` スキル |

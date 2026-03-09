# MCPサーバーテンプレート管理機能 設計書

**作成日**: 2026-03-09
**対象**: `apps/manager`
**ステータス**: 設計中

---

## 1. 概要

### 1.1 目的

管理者がManager UI経由でMCPサーバーテンプレートの追加・編集・削除を行えるようにする。

### 1.2 現状

- MCPサーバーテンプレートは`McpServerTemplate`テーブルに保存
- 現在はスクリプト（`packages/scripts/src/upsertStdioMcpServers.ts`）でシード
- 管理UIが存在しない

### 1.3 要件

| 要件 | 優先度 |
|------|--------|
| テンプレート一覧表示 | 🔴 必須 |
| テンプレート作成 | 🔴 必須 |
| テンプレート編集 | 🔴 必須 |
| テンプレート削除 | 🔴 必須 |
| フィルタリング（STDIO/SSE/組織） | 🟡 推奨 |
| 検証（コマンド・引数） | 🟡 推奨 |
| プレビュー・テスト実行 | 🟢 将来 |

---

## 2. データモデル（既存）

### 2.1 McpServerTemplate

```prisma
model McpServerTemplate {
  id                String              @id @default(cuid())
  name              String              // 表示名（例: "DeepL STDIO"）
  normalizedName    String              // 識別子（例: "deepl"）
  description       String              // 説明
  iconPath          String?             // アイコンパス
  tags              String[]            // タグ（例: ["translation", "api"]）
  transportType     TransportType       // STDIO | SSE
  authType          AuthType            // ENV_VAR | OAUTH | FILE
  visibility        McpServerVisibility // PUBLIC | PRIVATE | HIDDEN

  // STDIO用
  command           String?             // 実行コマンド（例: "npx"）
  args              String[]            // 引数（例: ["-y", "@modelcontextprotocol/server-deepl"]）
  envVarKeys        String[]            // 環境変数キー（例: ["X-DeepL-API-Key"]）

  // SSE用
  endpoint          String?             // SSEエンドポイント

  organizationId    String              // 組織ID（公式は"official-tumiki"）
  organization      Organization        @relation(...)

  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  @@unique([normalizedName, organizationId])
  @@index([organizationId])
  @@index([transportType])
}
```

### 2.2 TransportType

```prisma
enum TransportType {
  STDIO  // mcp-wrapperで管理（環境変数ベース）
  SSE    // mcp-proxyで管理（HTTP/SSE）
}
```

### 2.3 AuthType

```prisma
enum AuthType {
  ENV_VAR  // 環境変数（APIキー等）
  OAUTH    // OAuth認証
  FILE     // ファイルベース（設定ファイル等）
  NONE     // 認証不要
}
```

---

## 3. 画面設計

### 3.1 ページ構成

```
/admin
  └── /mcp-servers
       ├── /page.tsx              # 一覧画面
       ├── /new/page.tsx          # 新規作成画面
       └── /[id]/edit/page.tsx    # 編集画面
```

### 3.2 一覧画面 `/admin/mcp-servers`

**機能**:
- テンプレート一覧表示（テーブル）
- フィルタリング（TransportType, AuthType, 組織）
- 検索（名前・説明）
- 新規作成ボタン
- 編集・削除アクション

**表示項目**:
| 列 | 説明 |
|----|------|
| アイコン | iconPath |
| 名前 | name |
| 識別子 | normalizedName |
| タイプ | STDIO / SSE |
| 認証 | ENV_VAR / OAUTH / FILE / NONE |
| 組織 | organization.name |
| タグ | tags |
| アクション | 編集 / 削除 |

**フィルタ**:
```typescript
type Filter = {
  transportType?: TransportType;
  authType?: AuthType;
  organizationId?: string;
  search?: string; // name, description検索
};
```

### 3.3 作成/編集画面

**フォームフィールド**:

#### 基本情報（すべてのタイプ共通）
- `name` (必須): 表示名
- `normalizedName` (必須): 識別子（小文字・ハイフン）
- `description` (必須): 説明
- `iconPath` (任意): アイコンURL
- `tags` (任意): タグ（複数選択）
- `transportType` (必須): STDIO / SSE（ラジオボタン）
- `authType` (必須): ENV_VAR / OAUTH / FILE / NONE
- `visibility` (必須): PUBLIC / PRIVATE / HIDDEN
- `organizationId` (必須): 組織選択（デフォルト: 現在の組織）

#### STDIO専用（`transportType === STDIO`の場合）
- `command` (必須): 実行コマンド（例: `npx`）
- `args` (必須): 引数（配列、例: `["-y", "package-name"]`）
- `envVarKeys` (任意): 環境変数キー（配列、例: `["X-API-Key"]`）

#### SSE専用（`transportType === SSE`の場合）
- `endpoint` (必須): SSEエンドポイントURL

**バリデーション**:
```typescript
const mcpServerTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  normalizedName: z.string().regex(/^[a-z0-9-]+$/), // 小文字・数字・ハイフン
  description: z.string().min(1).max(500),
  iconPath: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  transportType: z.enum(["STDIO", "SSE"]),
  authType: z.enum(["ENV_VAR", "OAUTH", "FILE", "NONE"]),
  visibility: z.enum(["PUBLIC", "PRIVATE", "HIDDEN"]),
  organizationId: z.string().cuid(),

  // STDIO専用
  command: z.string().min(1).optional(),
  args: z.array(z.string()).optional(),
  envVarKeys: z.array(z.string()).optional(),

  // SSE専用
  endpoint: z.string().url().optional(),
}).superRefine((data, ctx) => {
  // STDIO: command必須
  if (data.transportType === "STDIO" && !data.command) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["command"],
      message: "Command is required for STDIO servers",
    });
  }

  // SSE: endpoint必須
  if (data.transportType === "SSE" && !data.endpoint) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endpoint"],
      message: "Endpoint is required for SSE servers",
    });
  }
});
```

---

## 4. API設計（tRPC）

### 4.1 ルーター構成

```typescript
// packages/api/src/routers/admin/mcpServerTemplate.ts
export const mcpServerTemplateRouter = router({
  list: protectedProcedure
    .input(z.object({
      transportType: z.enum(["STDIO", "SSE"]).optional(),
      authType: z.enum(["ENV_VAR", "OAUTH", "FILE", "NONE"]).optional(),
      organizationId: z.string().cuid().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      // 一覧取得
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      // 詳細取得
    }),

  create: protectedProcedure
    .input(mcpServerTemplateSchema)
    .mutation(async ({ input, ctx }) => {
      // 作成
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().cuid(),
      data: mcpServerTemplateSchema.partial(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 更新
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      // 削除（論理削除 or 物理削除）
    }),
});
```

### 4.2 権限チェック

```typescript
// 管理者のみアクセス可能
const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // 管理者権限チェック
  const isAdmin = await checkAdminPermission(ctx.session.user.id);
  if (!isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }

  return next({ ctx });
});
```

### 4.3 組織スコープ

```typescript
// 組織スコープの制限
const list = async ({ input, ctx }) => {
  const { organizationId } = input;

  // ユーザーの組織を取得
  const userOrg = await getUserOrganization(ctx.session.user.id);

  // 自組織 + 公式のみ表示
  const where = {
    organizationId: {
      in: [userOrg.id, OFFICIAL_ORGANIZATION_ID],
    },
    ...input, // フィルタ条件
  };

  return db.mcpServerTemplate.findMany({ where });
};
```

---

## 5. 実装手順

### Phase 1: 基盤実装（1日）

1. **tRPCルーター作成**
   ```bash
   # ファイル作成
   packages/api/src/routers/admin/mcpServerTemplate.ts
   ```

2. **Zodスキーマ定義**
   ```bash
   # 共通スキーマ
   packages/api/src/schemas/mcpServerTemplate.ts
   ```

3. **権限チェックMiddleware**
   ```typescript
   // 管理者権限確認
   packages/api/src/middleware/requireAdmin.ts
   ```

### Phase 2: UI実装（2日）

1. **一覧画面**
   ```bash
   apps/manager/src/app/(authenticated)/admin/mcp-servers/page.tsx
   apps/manager/src/app/(authenticated)/admin/mcp-servers/_components/McpServerList.tsx
   apps/manager/src/app/(authenticated)/admin/mcp-servers/_components/McpServerFilters.tsx
   ```

2. **作成画面**
   ```bash
   apps/manager/src/app/(authenticated)/admin/mcp-servers/new/page.tsx
   apps/manager/src/app/(authenticated)/admin/mcp-servers/_components/McpServerForm.tsx
   ```

3. **編集画面**
   ```bash
   apps/manager/src/app/(authenticated)/admin/mcp-servers/[id]/edit/page.tsx
   ```

### Phase 3: テスト・検証（1日）

1. **単体テスト**
   - tRPCルーターテスト
   - バリデーションテスト

2. **E2Eテスト**
   - CRUD操作テスト
   - 権限チェックテスト

---

## 6. セキュリティ考慮事項

| 項目 | 対策 |
|------|------|
| 権限管理 | 管理者のみアクセス可能 |
| 組織スコープ | 自組織+公式のみ操作可能 |
| 入力検証 | Zodスキーマで厳密に検証 |
| XSS対策 | React自動エスケープ |
| CSRF対策 | tRPCのトークン検証 |
| コマンドインジェクション | `command`/`args`の検証・サニタイズ |

**特に重要: コマンドインジェクション対策**

```typescript
// 危険なコマンドのブロックリスト
const BLOCKED_COMMANDS = ["rm", "dd", "mkfs", "eval", "exec"];

const validateCommand = (command: string) => {
  const normalized = command.toLowerCase().trim();

  if (BLOCKED_COMMANDS.some(blocked => normalized.includes(blocked))) {
    throw new Error("Blocked command detected");
  }

  // 許可されたコマンドのホワイトリスト（推奨）
  const ALLOWED_COMMANDS = ["npx", "node", "python", "python3"];
  if (!ALLOWED_COMMANDS.includes(normalized)) {
    throw new Error("Command not allowed");
  }
};
```

---

## 7. UI/UX仕様

### 7.1 一覧画面

```
┌─────────────────────────────────────────────────────────┐
│ MCPサーバーテンプレート管理                              │
├─────────────────────────────────────────────────────────┤
│ [新規作成]  🔍 検索  [STDIO ▼] [すべての組織 ▼]         │
├─────────────────────────────────────────────────────────┤
│ ┌─┬──────────┬────────┬────────┬──────┬──────┬────┐ │
│ │📝│ DeepL    │deepl   │STDIO   │ENV_VAR│公式  │✏️🗑│ │
│ ├─┼──────────┼────────┼────────┼──────┼──────┼────┤ │
│ │🔧│ GitHub   │github  │STDIO   │ENV_VAR│公式  │✏️🗑│ │
│ ├─┼──────────┼────────┼────────┼──────┼──────┼────┤ │
│ │🌐│ Custom   │custom  │SSE     │OAUTH │組織A │✏️🗑│ │
│ └─┴──────────┴────────┴────────┴──────┴──────┴────┘ │
└─────────────────────────────────────────────────────────┘
```

### 7.2 作成/編集フォーム

```
┌─────────────────────────────────────────────────────────┐
│ MCPサーバーテンプレート作成                              │
├─────────────────────────────────────────────────────────┤
│ 基本情報                                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 名前 *         [                                  ] │ │
│ │ 識別子 *       [                                  ] │ │
│ │ 説明 *         [                                  ] │ │
│ │ アイコンURL     [                                  ] │ │
│ │ タグ           [translation] [api] [+ 追加]        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ 設定                                                     │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ TransportType * ( ) STDIO  (•) SSE                 │ │
│ │ AuthType *      ( ) ENV_VAR (•) OAUTH ( ) FILE     │ │
│ │ Visibility *    (•) PUBLIC ( ) PRIVATE ( ) HIDDEN  │ │
│ │ 組織 *          [公式 Tumiki ▼]                    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ STDIOサーバー設定                                        │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ コマンド *     [npx                               ] │ │
│ │ 引数 *         [-y] [@modelcontextprotocol/...   ] │ │
│ │                [+ 引数を追加]                       │ │
│ │ 環境変数キー    [X-DeepL-API-Key                  ] │ │
│ │                [+ 環境変数を追加]                   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ [キャンセル]  [作成]                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 8. テスト戦略

### 8.1 単体テスト

```typescript
// packages/api/src/routers/admin/__tests__/mcpServerTemplate.test.ts
describe("mcpServerTemplate.list", () => {
  test("管理者は一覧を取得できる", async () => {
    const result = await caller.mcpServerTemplate.list({});
    expect(result.length).toBeGreaterThan(0);
  });

  test("非管理者はエラー", async () => {
    await expect(
      nonAdminCaller.mcpServerTemplate.list({})
    ).rejects.toThrow("FORBIDDEN");
  });
});

describe("mcpServerTemplate.create", () => {
  test("STDIOサーバーを作成できる", async () => {
    const result = await caller.mcpServerTemplate.create({
      name: "Test Server",
      normalizedName: "test-server",
      description: "Test",
      transportType: "STDIO",
      authType: "ENV_VAR",
      command: "npx",
      args: ["-y", "test-package"],
      // ...
    });

    expect(result.id).toBeDefined();
  });

  test("コマンド未指定でエラー", async () => {
    await expect(
      caller.mcpServerTemplate.create({
        // command未指定
        transportType: "STDIO",
        // ...
      })
    ).rejects.toThrow("Command is required");
  });
});
```

### 8.2 E2Eテスト

```typescript
// apps/manager/tests/e2e/mcp-server-template.spec.ts
test("MCPサーバーテンプレートのCRUD", async ({ page }) => {
  // 一覧表示
  await page.goto("/admin/mcp-servers");
  await expect(page.locator("h1")).toContainText("MCPサーバーテンプレート");

  // 新規作成
  await page.click('text="新規作成"');
  await page.fill('[name="name"]', "Test Server");
  await page.fill('[name="normalizedName"]', "test-server");
  await page.fill('[name="description"]', "Test Description");
  await page.check('[value="STDIO"]');
  await page.fill('[name="command"]', "npx");
  await page.click('text="作成"');

  // 作成確認
  await expect(page.locator("text=Test Server")).toBeVisible();

  // 編集
  await page.click('[aria-label="編集"]');
  await page.fill('[name="description"]', "Updated Description");
  await page.click('text="保存"');

  // 削除
  await page.click('[aria-label="削除"]');
  await page.click('text="削除を確認"');

  // 削除確認
  await expect(page.locator("text=Test Server")).not.toBeVisible();
});
```

---

## 9. マイグレーション

**既存スキーマを使用するため、マイグレーション不要**

ただし、将来的に以下のフィールド追加を検討：

```prisma
model McpServerTemplate {
  // ... 既存フィールド

  // 将来追加予定
  isActive          Boolean   @default(true)   // 有効/無効フラグ
  allowedRoles      String[]                    // 許可ロール
  rateLimit         Int?                        // レート制限（req/min）
  deletedAt         DateTime?                   // 論理削除用
}
```

---

## 10. 運用・監視

### 10.1 監査ログ

```typescript
// テンプレート変更時にログ記録
await auditLog.create({
  action: "MCP_TEMPLATE_CREATED",
  userId: ctx.session.user.id,
  resourceType: "McpServerTemplate",
  resourceId: template.id,
  metadata: {
    name: template.name,
    transportType: template.transportType,
  },
});
```

### 10.2 通知

- 公式テンプレートの作成・削除時にSlack通知
- 危険なコマンドの登録試行時にアラート

---

## 11. 関連ドキュメント

| ドキュメント | 場所 |
|-------------|------|
| mcp-wrapper設計 | `docs/proposals/mcp-wrapper-design.md` |
| Manager アーキテクチャ | `.claude/skills/tumiki-manager-architecture/SKILL.md` |
| API パターン | `.claude/skills/tumiki-api-patterns/SKILL.md` |
| DBスキーマ | `packages/db/prisma/schema/mcpServer.prisma` |

---

**最終更新**: 2026-03-09
**作成者**: Claude Sonnet 4.5

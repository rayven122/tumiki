import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TransportType } from "@tumiki/db/server";
import { nameValidationSchema } from "@/schema/validation";
import { createApiKeyMcpServer } from "./createApiKeyMcpServer";
import { createIntegratedMcpServer } from "./createIntegratedMcpServer";
import { findMcpServers } from "./findMcpServers";
import { getMcpConfig } from "./getMcpConfig";
import { updateMcpConfig } from "./updateMcpConfig";
import { updateOfficialServer } from "./update";
import {
  deleteMcpServer,
  deleteMcpServerInputSchema,
  deleteMcpServerOutputSchema,
} from "./deleteMcpServer";
import {
  updateDisplayOrder,
  updateDisplayOrderInputSchema,
  updateDisplayOrderOutputSchema,
} from "./updateDisplayOrder";
import { updateName } from "./updateName";
import { updateIconPath } from "./updateIconPath";
import { findById } from "./findById";
import { findBySlug } from "./findBySlug";
import { getToolStats, getToolStatsOutputSchema } from "./getToolStats";
import {
  updateServerStatus,
  updateServerStatusOutputSchema,
} from "./updateServerStatus";
import { toggleTool, toggleToolOutputSchema } from "./toggleTool";
import { updatePiiMasking } from "./updatePiiMasking";
import { updateToonConversion } from "./updateToonConversion";
import { updateDynamicSearch } from "./updateDynamicSearch";
import { refreshTools } from "./refreshTools";
import { sendToolChangeNotifications } from "./sendToolChangeNotifications";
import { McpServerIdSchema, ToolIdSchema } from "@/schema/ids";
import { createBulkNotifications } from "@/features/notification";
import { validateMcpPermission } from "@/server/utils/mcpPermissions";
import {
  McpServerSchema,
  McpServerTemplateInstanceSchema,
  McpServerTemplateSchema,
  McpToolSchema,
} from "@tumiki/db/zod";

// APIキー認証MCPサーバー作成用の入力スキーマ
export const CreateApiKeyMcpServerInputV2 = z
  .object({
    mcpServerTemplateId: z.string().optional(),
    customUrl: z.string().url().optional(),
    transportType: z.nativeEnum(TransportType).optional(),
    envVars: z.record(z.string(), z.string()).optional(),
    name: nameValidationSchema,
    slug: z
      .string()
      .min(1, "スラッグは必須です")
      .regex(
        /^[a-z0-9-]+$/,
        "スラッグは小文字英数字とハイフンのみ使用可能です",
      ),
    description: z.string().optional(),
    authType: z.enum(["NONE", "API_KEY"]),
  })
  .refine((data) => data.mcpServerTemplateId ?? data.customUrl, {
    message: "mcpServerTemplateId または customUrl のいずれかが必要です",
  });

export const CreateApiKeyMcpServerOutputV2 = z.object({
  id: z.string(),
});

// 統合MCPサーバー作成用の入力スキーマ
// toolIdsはオプショナル - 省略時は全ツール選択
export const CreateIntegratedMcpServerInputV2 = z.object({
  name: nameValidationSchema,
  slug: z
    .string()
    .min(1, "スラッグは必須です")
    .regex(/^[a-z0-9-]+$/, "スラッグは小文字英数字とハイフンのみ使用可能です"),
  description: z.string().optional(),
  templates: z
    .array(
      z.object({
        mcpServerTemplateId: z.string(),
        normalizedName: z.string(),
        toolIds: z.array(ToolIdSchema).optional(),
        envVars: z.record(z.string(), z.string()).optional(),
      }),
    )
    .min(2, "統合サーバーには2つ以上のテンプレートが必要です"),
});

export const CreateIntegratedMcpServerOutputV2 = z.object({
  id: z.string(),
});

// MCP設定取得用の入力スキーマ
export const GetMcpConfigInputV2 = z.object({
  templateInstanceId: z.string(),
});

// MCP設定取得用の出力スキーマ
export const GetMcpConfigOutputV2 = z.object({
  templateInstanceId: z.string(),
  templateName: z.string(),
  templateIconPath: z.string().nullable(),
  templateUrl: z.string().nullable(),
  envVarKeys: z.array(z.string()),
  envVars: z.record(z.string(), z.string()),
  hasConfig: z.boolean(),
});

// MCP設定更新用の入力スキーマ
export const UpdateMcpConfigInputV2 = z.object({
  templateInstanceId: z.string(),
  envVars: z.record(z.string(), z.string()),
});

// MCP設定更新用の出力スキーマ
export const UpdateMcpConfigOutputV2 = z.object({
  id: z.string(),
  templateInstanceId: z.string(),
});

// 公式MCPサーバー更新用の入力スキーマ（後方互換性のため維持）
export const UpdateOfficialServerInputV2 = z.object({
  id: z.string(),
  envVars: z.record(z.string(), z.string()),
});

// 公式MCPサーバー更新用の出力スキーマ（後方互換性のため維持）
export const UpdateOfficialServerOutputV2 = z.object({
  id: z.string(),
});

// APIキー出力用のスキーマ
const ApiKeyOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  expiresAt: z.date().nullable(),
  createdAt: z.date(),
});

// 作成者情報のスキーマ
const CreatedBySchema = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
  })
  .nullable();

// MCPサーバー一覧取得用の出力スキーマ
export const FindMcpServersOutputV2 = z.array(
  McpServerSchema.extend({
    apiKeys: z.array(ApiKeyOutputSchema),
    templateInstances: z.array(
      McpServerTemplateInstanceSchema.extend({
        mcpServerTemplate: McpServerTemplateSchema,
        tools: z.array(
          McpToolSchema.extend({
            isEnabled: z.boolean(),
          }),
        ),
        // 現在のユーザーのOAuth認証状態（null: OAuthが不要、true: 認証済み、false: 未認証）
        isOAuthAuthenticated: z.boolean().nullable(),
        // OAuthトークンの有効期限（null: OAuthが不要または未認証）
        oauthTokenExpiresAt: z.date().nullable(),
      }),
    ),
    // サーバー全体のOAuth認証状態（null: OAuthが不要、true: 全て認証済み、false: 一部未認証）
    allOAuthAuthenticated: z.boolean().nullable(),
    // 最も早く期限切れになるOAuthトークンの有効期限（null: OAuthが不要または未認証）
    earliestOAuthExpiration: z.date().nullable(),
    // 最終使用日時（RequestLogから取得）
    lastUsedAt: z.date().nullable(),
    // 作成者情報
    createdBy: CreatedBySchema,
  }),
);

export const UpdateNameInputV2 = z.object({
  id: z.string(),
  name: nameValidationSchema,
  description: z.string().optional(),
});

export const UpdateNameOutputV2 = z.object({
  id: z.string(),
});

// アイコンパス更新の入力スキーマ
export const UpdateIconPathInputV2 = z.object({
  id: McpServerIdSchema,
  iconPath: z.string().nullable(), // lucide:* 形式またはURL、nullで削除
});

// アイコンパス更新の出力スキーマ
export const UpdateIconPathOutputV2 = z.object({
  id: z.string(),
});

// サーバー詳細取得の入力スキーマ
export const FindByIdInputV2 = z.object({
  id: McpServerIdSchema,
});

// サーバー詳細取得（slug指定）の入力スキーマ
export const FindBySlugInputV2 = z.object({
  slug: z.string(),
});

// ツール統計取得の入力スキーマ
export const GetToolStatsInputV2 = z.object({
  userMcpServerId: McpServerIdSchema,
});

// サーバーステータス更新の入力スキーマ
export const UpdateServerStatusInputV2 = z.object({
  id: McpServerIdSchema,
  isEnabled: z.boolean(),
});

// ツールトグルの入力スキーマ
export const ToggleToolInputV2 = z.object({
  templateInstanceId: z.string(),
  toolId: ToolIdSchema,
  isEnabled: z.boolean(),
});

// PIIマスキング設定更新の入力スキーマ
export const UpdatePiiMaskingInputV2 = z.object({
  id: McpServerIdSchema,
  piiMaskingEnabled: z.boolean(),
});

// PIIマスキング設定更新の出力スキーマ
export const UpdatePiiMaskingOutputV2 = z.object({
  id: z.string(),
});

// TOON変換設定更新の入力スキーマ
export const UpdateToonConversionInputV2 = z.object({
  id: McpServerIdSchema,
  toonConversionEnabled: z.boolean(),
});

// TOON変換設定更新の出力スキーマ
export const UpdateToonConversionOutputV2 = z.object({
  id: z.string(),
});

// Dynamic Search設定更新の入力スキーマ
export const UpdateDynamicSearchInputV2 = z.object({
  id: McpServerIdSchema,
  dynamicSearchEnabled: z.boolean(),
});

// Dynamic Search設定更新の出力スキーマ
export const UpdateDynamicSearchOutputV2 = z.object({
  id: z.string(),
});

// ツール更新の入力スキーマ
export const RefreshToolsInputV2 = z.object({
  id: McpServerIdSchema,
  /** プレビューモード: trueの場合はDBに反映せず差分のみ返す */
  dryRun: z.boolean().optional().default(false),
});

// ツール変更の種類
const ToolChangeTypeSchema = z.enum([
  "added",
  "removed",
  "modified",
  "unchanged",
]);

// 個別のツール変更情報
const ToolChangeSchema = z.object({
  type: ToolChangeTypeSchema,
  name: z.string(),
  description: z.string().optional(),
  previousDescription: z.string().optional(),
  previousInputSchema: z.record(z.string(), z.unknown()).optional(),
});

// テンプレートインスタンスごとの変更結果
const TemplateInstanceToolChangesSchema = z.object({
  templateInstanceId: z.string(),
  templateName: z.string(),
  changes: z.array(ToolChangeSchema),
  hasChanges: z.boolean(),
  addedCount: z.number(),
  removedCount: z.number(),
  modifiedCount: z.number(),
  unchangedCount: z.number(),
});

// 影響を受ける組織の情報
const AffectedOrganizationSchema = z.object({
  organizationId: z.string(),
  mcpServerId: z.string(),
  mcpServerName: z.string(),
});

// ツール更新の出力スキーマ
export const RefreshToolsOutputV2 = z.object({
  success: z.boolean(),
  templateInstances: z.array(TemplateInstanceToolChangesSchema),
  totalAddedCount: z.number(),
  totalRemovedCount: z.number(),
  totalModifiedCount: z.number(),
  hasAnyChanges: z.boolean(),
  affectedOrganizations: z.array(AffectedOrganizationSchema),
});

export const userMcpServerRouter = createTRPCRouter({
  // APIキー認証MCPサーバー作成
  createApiKeyMcpServer: protectedProcedure
    .input(CreateApiKeyMcpServerInputV2)
    .output(CreateApiKeyMcpServerOutputV2)
    .mutation(async ({ ctx, input }) => {
      // MCP書き込み権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "write",
      });

      const result = await ctx.db.$transaction(
        async (tx) => {
          return await createApiKeyMcpServer(
            tx,
            input,
            ctx.currentOrg.id,
            ctx.session.user.id,
          );
        },
        {
          timeout: 15000, // MCPサーバーからのツール取得に最大10秒かかるため、15秒に設定
        },
      );

      // トランザクション完了後に通知を送信（トランザクション外で実行）
      void createBulkNotifications(ctx.db, {
        type: "MCP_SERVER_ADDED",
        priority: "LOW",
        title: "MCPサーバーが追加されました",
        message: `「${input.name}」が組織に追加されました。`,
        linkUrl: `/${ctx.currentOrg.slug}/mcps/${input.slug}`,
        organizationId: ctx.currentOrg.id,
        triggeredById: ctx.session.user.id,
      });

      return result;
    }),

  // 統合MCPサーバー作成
  createIntegratedMcpServer: protectedProcedure
    .input(CreateIntegratedMcpServerInputV2)
    .output(CreateIntegratedMcpServerOutputV2)
    .mutation(async ({ ctx, input }) => {
      // MCP書き込み権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "write",
      });

      const result = await ctx.db.$transaction(async (tx) => {
        return await createIntegratedMcpServer(
          tx,
          input,
          ctx.currentOrg.id,
          ctx.session.user.id,
        );
      });

      // トランザクション完了後に通知を送信（トランザクション外で実行）
      void createBulkNotifications(ctx.db, {
        type: "MCP_SERVER_ADDED",
        priority: "LOW",
        title: "MCPサーバーが追加されました",
        message: `「${input.name}」が組織に追加されました。`,
        linkUrl: `/${ctx.currentOrg.slug}/mcps/${input.slug}`,
        organizationId: ctx.currentOrg.id,
        triggeredById: ctx.session.user.id,
      });

      return result;
    }),

  // MCP設定取得（テンプレートインスタンスごとの環境変数）
  getMcpConfig: protectedProcedure
    .input(GetMcpConfigInputV2)
    .output(GetMcpConfigOutputV2)
    .query(async ({ ctx, input }) => {
      // MCP読み取り権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "read",
      });

      return await getMcpConfig(ctx.db, {
        templateInstanceId: input.templateInstanceId,
        organizationId: ctx.currentOrg.id,
        userId: ctx.session.user.id,
      });
    }),

  // MCP設定更新（テンプレートインスタンスごとの環境変数）
  updateMcpConfig: protectedProcedure
    .input(UpdateMcpConfigInputV2)
    .output(UpdateMcpConfigOutputV2)
    .mutation(async ({ ctx, input }) => {
      // MCP書き込み権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "write",
      });

      return await ctx.db.$transaction(async (tx) => {
        return await updateMcpConfig(tx, {
          templateInstanceId: input.templateInstanceId,
          envVars: input.envVars,
          organizationId: ctx.currentOrg.id,
          userId: ctx.session.user.id,
        });
      });
    }),

  // 公式MCPサーバー更新（後方互換性のため維持）
  update: protectedProcedure
    .input(UpdateOfficialServerInputV2)
    .output(UpdateOfficialServerOutputV2)
    .mutation(async ({ ctx, input }) => {
      // MCP書き込み権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "write",
      });

      return await ctx.db.$transaction(async (tx) => {
        return await updateOfficialServer(
          tx,
          input,
          ctx.currentOrg.id,
          ctx.session.user.id,
        );
      });
    }),

  // MCPサーバー一覧取得
  findMcpServers: protectedProcedure
    .output(FindMcpServersOutputV2)
    .query(async ({ ctx }) => {
      // MCP読み取り権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "read",
      });

      return await findMcpServers(ctx.db, {
        organizationId: ctx.currentOrg.id,
        userId: ctx.session.user.id,
      });
    }),

  // MCPサーバー削除
  delete: protectedProcedure
    .input(deleteMcpServerInputSchema)
    .output(deleteMcpServerOutputSchema)
    .mutation(async ({ ctx, input }) => {
      // 特定MCPサーバーへの書き込み権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "write",
        mcpServerId: input.id,
      });

      const result = await deleteMcpServer(ctx.db, {
        id: input.id,
        organizationId: ctx.currentOrg.id,
      });

      // 削除完了後に通知を送信（トランザクション外で実行）
      void createBulkNotifications(ctx.db, {
        type: "MCP_SERVER_DELETED",
        priority: "NORMAL",
        title: "MCPサーバーが削除されました",
        message: `「${result.name}」が組織から削除されました。`,
        organizationId: ctx.currentOrg.id,
        triggeredById: ctx.session.user.id,
      });

      return result;
    }),

  // 表示順序更新
  updateDisplayOrder: protectedProcedure
    .input(updateDisplayOrderInputSchema)
    .output(updateDisplayOrderOutputSchema)
    .mutation(async ({ ctx, input }) => {
      // MCP書き込み権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "write",
      });

      return ctx.db.$transaction(async (tx) => {
        return await updateDisplayOrder(tx, input, ctx.currentOrg.id);
      });
    }),

  // 名前と説明の更新
  updateName: protectedProcedure
    .input(UpdateNameInputV2)
    .output(UpdateNameOutputV2)
    .mutation(async ({ ctx, input }) => {
      // 特定MCPサーバーへの書き込み権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "write",
        mcpServerId: input.id,
      });

      return await ctx.db.$transaction(async (tx) => {
        return await updateName(tx, input, ctx.currentOrg.id);
      });
    }),

  // アイコンパス更新
  updateIconPath: protectedProcedure
    .input(UpdateIconPathInputV2)
    .output(UpdateIconPathOutputV2)
    .mutation(async ({ ctx, input }) => {
      // 特定MCPサーバーへの書き込み権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "write",
        mcpServerId: input.id,
      });

      return await ctx.db.$transaction(async (tx) => {
        return await updateIconPath(tx, input, ctx.currentOrg.id);
      });
    }),

  // サーバー詳細取得
  findById: protectedProcedure
    .input(FindByIdInputV2)
    .query(async ({ ctx, input }) => {
      // 特定MCPサーバーへの読み取り権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "read",
        mcpServerId: input.id,
      });

      return await findById(ctx.db, {
        id: input.id,
        organizationId: ctx.currentOrg.id,
      });
    }),

  // サーバー詳細取得（slug指定）
  findBySlug: protectedProcedure
    .input(FindBySlugInputV2)
    .query(async ({ ctx, input }) => {
      // MCP読み取り権限チェック（slug取得時はサーバーIDが不明なため全体権限チェック）
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "read",
      });

      return await findBySlug(ctx.db, {
        slug: input.slug,
        organizationId: ctx.currentOrg.id,
      });
    }),

  // ツール統計取得
  getToolStats: protectedProcedure
    .input(GetToolStatsInputV2)
    .output(getToolStatsOutputSchema)
    .query(async ({ ctx, input }) => {
      // 特定MCPサーバーへの読み取り権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "read",
        mcpServerId: input.userMcpServerId,
      });

      return await getToolStats(ctx.db, {
        userMcpServerId: input.userMcpServerId,
        organizationId: ctx.currentOrg.id,
      });
    }),

  // サーバーステータス更新
  updateServerStatus: protectedProcedure
    .input(UpdateServerStatusInputV2)
    .output(updateServerStatusOutputSchema)
    .mutation(async ({ ctx, input }) => {
      // 特定MCPサーバーへの書き込み権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "write",
        mcpServerId: input.id,
      });

      return await ctx.db.$transaction(async (tx) => {
        return await updateServerStatus(
          tx,
          {
            id: input.id,
            isEnabled: input.isEnabled,
            organizationId: ctx.currentOrg.id,
            organizationSlug: ctx.currentOrg.slug,
          },
          ctx.session.user.id,
        );
      });
    }),

  // ツール有効化/無効化
  toggleTool: protectedProcedure
    .input(ToggleToolInputV2)
    .output(toggleToolOutputSchema)
    .mutation(async ({ ctx, input }) => {
      // MCP書き込み権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "write",
      });

      return await ctx.db.$transaction(async (tx) => {
        return await toggleTool(
          tx,
          {
            templateInstanceId: input.templateInstanceId,
            toolId: input.toolId,
            isEnabled: input.isEnabled,
          },
          ctx.session.user.id,
          ctx.currentOrg.id,
        );
      });
    }),

  // PIIマスキング設定更新
  updatePiiMasking: protectedProcedure
    .input(UpdatePiiMaskingInputV2)
    .output(UpdatePiiMaskingOutputV2)
    .mutation(async ({ ctx, input }) => {
      // 特定MCPサーバーへの書き込み権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "write",
        mcpServerId: input.id,
      });

      return await ctx.db.$transaction(async (tx) => {
        return await updatePiiMasking(tx, {
          id: input.id,
          piiMaskingEnabled: input.piiMaskingEnabled,
          organizationId: ctx.currentOrg.id,
        });
      });
    }),

  // TOON変換設定更新
  updateToonConversion: protectedProcedure
    .input(UpdateToonConversionInputV2)
    .output(UpdateToonConversionOutputV2)
    .mutation(async ({ ctx, input }) => {
      // 特定MCPサーバーへの書き込み権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "write",
        mcpServerId: input.id,
      });

      return await updateToonConversion(ctx.db, {
        id: input.id,
        toonConversionEnabled: input.toonConversionEnabled,
        organizationId: ctx.currentOrg.id,
      });
    }),

  // Dynamic Search設定更新
  updateDynamicSearch: protectedProcedure
    .input(UpdateDynamicSearchInputV2)
    .output(UpdateDynamicSearchOutputV2)
    .mutation(async ({ ctx, input }) => {
      // 特定MCPサーバーへの書き込み権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "write",
        mcpServerId: input.id,
      });

      return await updateDynamicSearch(ctx.db, {
        id: input.id,
        dynamicSearchEnabled: input.dynamicSearchEnabled,
        organizationId: ctx.currentOrg.id,
      });
    }),

  // ツール更新（再取得・同期）
  refreshTools: protectedProcedure
    .input(RefreshToolsInputV2)
    .output(RefreshToolsOutputV2)
    .mutation(async ({ ctx, input }) => {
      // 特定MCPサーバーへの書き込み権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "write",
        mcpServerId: input.id,
      });

      const result = await ctx.db.$transaction(
        async (tx) => {
          return await refreshTools(tx, {
            mcpServerId: input.id,
            organizationId: ctx.currentOrg.id,
            userId: ctx.session.user.id,
            dryRun: input.dryRun,
          });
        },
        {
          timeout: 30000, // MCPサーバーからのツール取得に時間がかかる場合があるため30秒に設定
        },
      );

      // dryRunモードでない場合のみツール変更通知を送信
      if (!input.dryRun) {
        void sendToolChangeNotifications(ctx.db, {
          result,
          mcpServerId: input.id,
          organizationId: ctx.currentOrg.id,
          organizationSlug: ctx.currentOrg.slug,
          triggeredById: ctx.session.user.id,
        });
      }

      return result;
    }),
});

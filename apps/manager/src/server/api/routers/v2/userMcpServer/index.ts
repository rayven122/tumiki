import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TransportType } from "@tumiki/db/server";
import { nameValidationSchema } from "@/schema/validation";
import { createApiKeyMcpServer } from "./createApiKeyMcpServer";
import { createIntegratedMcpServer } from "./createIntegratedMcpServer";
import { updateOfficialServer } from "./update";
import { findMcpServers } from "./findMcpServers";
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
import { getToolStats, getToolStatsOutputSchema } from "./getToolStats";
import {
  updateServerStatus,
  updateServerStatusOutputSchema,
} from "./updateServerStatus";
import { toggleTool, toggleToolOutputSchema } from "./toggleTool";
import { updatePiiMasking } from "./updatePiiMasking";
import { updateToonConversion } from "./updateToonConversion";
import { updateDynamicSearch } from "./updateDynamicSearch";
import { McpServerIdSchema, ToolIdSchema } from "@/schema/ids";
import { createBulkNotifications } from "../notification/createBulkNotifications";
import { validateMcpPermission } from "@/server/utils/mcpPermissions";
import {
  McpServerSchema,
  McpApiKeySchema,
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

export const UpdateOfficialServerInputV2 = z.object({
  id: z.string(),
  envVars: z.record(z.string(), z.string()),
});

// MCPサーバー一覧取得用の出力スキーマ
export const FindMcpServersOutputV2 = z.array(
  McpServerSchema.extend({
    apiKeys: z.array(McpApiKeySchema),
    templateInstances: z.array(
      McpServerTemplateInstanceSchema.extend({
        mcpServerTemplate: McpServerTemplateSchema,
        tools: z.array(
          McpToolSchema.extend({
            isEnabled: z.boolean(),
          }),
        ),
      }),
    ),
  }),
);

export const UpdateOfficialServerOutputV2 = z.object({
  id: z.string(),
});

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
        linkUrl: `/${ctx.currentOrg.id}/mcps/${result.id}`,
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
        linkUrl: `/${ctx.currentOrg.id}/mcps/${result.id}`,
        organizationId: ctx.currentOrg.id,
        triggeredById: ctx.session.user.id,
      });

      return result;
    }),

  update: protectedProcedure
    .input(UpdateOfficialServerInputV2)
    .output(UpdateOfficialServerOutputV2)
    .mutation(async ({ ctx, input }) => {
      // 特定MCPサーバーへの書き込み権限チェック
      await validateMcpPermission(ctx.db, ctx.currentOrg, {
        permission: "write",
        mcpServerId: input.id,
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
});

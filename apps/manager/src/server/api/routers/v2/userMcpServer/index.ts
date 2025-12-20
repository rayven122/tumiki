import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TransportType } from "@tumiki/db/server";
import { nameValidationSchema } from "@/schema/validation";
import { createApiKeyMcpServer } from "./createApiKeyMcpServer";
import { createIntegratedMcpServer } from "./createIntegratedMcpServer";
import { updateOfficialServer } from "./update";
import { findOfficialServers } from "./findOfficialServers";
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
import { findById } from "./findById";
import { getToolStats, getToolStatsOutputSchema } from "./getToolStats";
import {
  updateServerStatus,
  updateServerStatusOutputSchema,
} from "./updateServerStatus";
import { toggleTool, toggleToolOutputSchema } from "./toggleTool";
import { McpServerIdSchema, ToolIdSchema } from "@/schema/ids";
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
export const CreateIntegratedMcpServerInputV2 = z.object({
  name: nameValidationSchema,
  description: z.string().optional(),
  templates: z
    .array(
      z.object({
        mcpServerTemplateId: z.string(),
        normalizedName: z.string(),
        toolIds: z.array(ToolIdSchema),
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

// 公式MCPサーバー一覧取得用の出力スキーマ
export const FindOfficialServersOutputV2 = z.array(
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

export const userMcpServerRouter = createTRPCRouter({
  // APIキー認証MCPサーバー作成
  createApiKeyMcpServer: protectedProcedure
    .input(CreateApiKeyMcpServerInputV2)
    .output(CreateApiKeyMcpServerOutputV2)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(
        async (tx) => {
          return await createApiKeyMcpServer(
            tx,
            input,
            ctx.session.user.organizationId,
            ctx.session.user.id,
          );
        },
        {
          timeout: 15000, // MCPサーバーからのツール取得に最大10秒かかるため、15秒に設定
        },
      );
    }),

  // 統合MCPサーバー作成
  createIntegratedMcpServer: protectedProcedure
    .input(CreateIntegratedMcpServerInputV2)
    .output(CreateIntegratedMcpServerOutputV2)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await createIntegratedMcpServer(
          tx,
          input,
          ctx.session.user.organizationId,
          ctx.session.user.id,
        );
      });
    }),

  update: protectedProcedure
    .input(UpdateOfficialServerInputV2)
    .output(UpdateOfficialServerOutputV2)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await updateOfficialServer(
          tx,
          input,
          ctx.session.user.organizationId,
          ctx.session.user.id,
        );
      });
    }),

  // 公式MCPサーバー一覧取得
  findOfficialServers: protectedProcedure
    .output(FindOfficialServersOutputV2)
    .query(async ({ ctx }) => {
      return await findOfficialServers(ctx.db, {
        organizationId: ctx.session.user.organizationId,
      });
    }),

  // MCPサーバー削除
  delete: protectedProcedure
    .input(deleteMcpServerInputSchema)
    .output(deleteMcpServerOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return await deleteMcpServer(ctx.db, {
        id: input.id,
        organizationId: ctx.session.user.organizationId,
      });
    }),

  // 表示順序更新
  updateDisplayOrder: protectedProcedure
    .input(updateDisplayOrderInputSchema)
    .output(updateDisplayOrderOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.db.$transaction(async (tx) => {
        return await updateDisplayOrder(
          tx,
          input,
          ctx.session.user.organizationId,
        );
      });
    }),

  // 名前と説明の更新
  updateName: protectedProcedure
    .input(UpdateNameInputV2)
    .output(UpdateNameOutputV2)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await updateName(tx, input, ctx.session.user.organizationId);
      });
    }),

  // サーバー詳細取得
  findById: protectedProcedure
    .input(FindByIdInputV2)
    .query(async ({ ctx, input }) => {
      return await findById(ctx.db, {
        id: input.id,
        organizationId: ctx.session.user.organizationId,
      });
    }),

  // ツール統計取得
  getToolStats: protectedProcedure
    .input(GetToolStatsInputV2)
    .output(getToolStatsOutputSchema)
    .query(async ({ ctx, input }) => {
      return await getToolStats(ctx.db, {
        userMcpServerId: input.userMcpServerId,
        organizationId: ctx.session.user.organizationId,
      });
    }),

  // サーバーステータス更新
  updateServerStatus: protectedProcedure
    .input(UpdateServerStatusInputV2)
    .output(updateServerStatusOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await updateServerStatus(
          tx,
          {
            id: input.id,
            isEnabled: input.isEnabled,
            organizationId: ctx.session.user.organizationId,
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
      return await ctx.db.$transaction(async (tx) => {
        return await toggleTool(
          tx,
          {
            templateInstanceId: input.templateInstanceId,
            toolId: input.toolId,
            isEnabled: input.isEnabled,
          },
          ctx.session.user.id,
          ctx.session.user.organizationId,
        );
      });
    }),
});

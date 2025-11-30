import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TransportType } from "@tumiki/db/server";
import { nameValidationSchema } from "@/schema/validation";
import { createApiKeyMcpServer } from "./createApiKeyMcpServer";
import { connectOAuthMcpServer } from "./connectOAuthMcpServer";
import { updateOfficialServer } from "./update";
import { handleOAuthCallback } from "./handleOAuthCallback";
import {
  findOfficialServers,
  findOfficialServersOutputSchema,
} from "./findOfficialServers";
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
import { findById, findByIdOutputSchema } from "./findById";
import {
  getRequestStats,
  getRequestStatsOutputSchema,
} from "./getRequestStats";
import {
  findRequestLogs,
  findRequestLogsOutputSchema,
} from "./findRequestLogs";
import { getToolStats, getToolStatsOutputSchema } from "./getToolStats";
import {
  updateServerStatus,
  updateServerStatusOutputSchema,
} from "./updateServerStatus";
import { toggleTool, toggleToolOutputSchema } from "./toggleTool";
import { McpServerIdSchema, ToolIdSchema } from "@/schema/ids";
import {
  getOAuthTokenStatus,
  getOAuthTokenStatusOutputSchema,
} from "./getOAuthTokenStatus";

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

// OAuth認証MCPサーバー接続用の入力スキーマ
export const ConnectOAuthMcpServerInputV2 = z.object({
  // テンプレートIDまたはカスタムURL（いずれか必須）
  templateId: z.string().optional(),
  customUrl: z.string().url().optional(),
  transportType: z.nativeEnum(TransportType).optional(),

  // サーバー情報
  name: nameValidationSchema.optional(),
  description: z.string().optional(),

  // OAuthクライアント情報（オプション）
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
});

export const ConnectOAuthMcpServerOutputV2 = z.object({
  id: z.string(),
  authorizationUrl: z.string(),
});

export const UpdateOfficialServerInputV2 = z.object({
  id: z.string(),
  envVars: z.record(z.string(), z.string()),
});

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

// OAuth Callback処理の入力スキーマ
export const HandleOAuthCallbackInputV2 = z.object({
  state: z.string(),
  currentUrl: z.string().url(),
});

export const HandleOAuthCallbackOutputV2 = z.object({
  organizationSlug: z.string(),
  success: z.boolean(),
  error: z.string().optional(),
});

// サーバー詳細取得の入力スキーマ
export const FindByIdInputV2 = z.object({
  id: McpServerIdSchema,
});

// リクエスト統計取得の入力スキーマ
export const GetRequestStatsInputV2 = z.object({
  userMcpServerId: McpServerIdSchema,
});

// リクエストログ取得の入力スキーマ
export const FindRequestLogsInputV2 = z.object({
  userMcpServerId: McpServerIdSchema,
  limit: z.number().optional(),
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
  userMcpServerId: McpServerIdSchema,
  toolId: ToolIdSchema,
  isEnabled: z.boolean(),
});

// OAuth トークン状態取得の入力スキーマ
export const GetOAuthTokenStatusInputV2 = z.object({
  mcpServerTemplateId: z.string(),
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

  // OAuth認証MCPサーバー接続
  connectOAuthMcpServer: protectedProcedure
    .input(ConnectOAuthMcpServerInputV2)
    .output(ConnectOAuthMcpServerOutputV2)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await connectOAuthMcpServer(
          tx,
          input,
          ctx.session.user.organizationId,
          ctx.session.user.id,
        );
      });
    }),

  // OAuth Callback処理
  handleOAuthCallback: protectedProcedure
    .input(HandleOAuthCallbackInputV2)
    .output(HandleOAuthCallbackOutputV2)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(
        async (tx) => {
          return await handleOAuthCallback(tx, {
            state: input.state,
            userId: ctx.session.user.id,
            currentUrl: new URL(input.currentUrl),
          });
        },
        {
          timeout: 15000, // MCPサーバーからのツール取得に最大10秒かかるため、15秒に設定
        },
      );
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
    .output(findOfficialServersOutputSchema)
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
    .output(findByIdOutputSchema)
    .query(async ({ ctx, input }) => {
      return await findById(ctx.db, {
        id: input.id,
        organizationId: ctx.session.user.organizationId,
      });
    }),

  // リクエスト統計取得
  getRequestStats: protectedProcedure
    .input(GetRequestStatsInputV2)
    .output(getRequestStatsOutputSchema)
    .query(async ({ ctx, input }) => {
      return await getRequestStats(ctx.db, {
        userMcpServerId: input.userMcpServerId,
        organizationId: ctx.session.user.organizationId,
      });
    }),

  // リクエストログ取得
  findRequestLogs: protectedProcedure
    .input(FindRequestLogsInputV2)
    .output(findRequestLogsOutputSchema)
    .query(async ({ ctx, input }) => {
      return await findRequestLogs(ctx.db, {
        userMcpServerId: input.userMcpServerId,
        organizationId: ctx.session.user.organizationId,
        limit: input.limit ?? undefined,
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
        return await updateServerStatus(tx, {
          id: input.id,
          isEnabled: input.isEnabled,
          organizationId: ctx.session.user.organizationId,
        });
      });
    }),

  // ツール有効化/無効化
  toggleTool: protectedProcedure
    .input(ToggleToolInputV2)
    .output(toggleToolOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await toggleTool(tx, {
          userMcpServerId: input.userMcpServerId,
          toolId: input.toolId,
          isEnabled: input.isEnabled,
          organizationId: ctx.session.user.organizationId,
        });
      });
    }),

  // OAuth トークン状態取得
  getOAuthTokenStatus: protectedProcedure
    .input(GetOAuthTokenStatusInputV2)
    .output(getOAuthTokenStatusOutputSchema)
    .query(async ({ ctx, input }) => {
      return await getOAuthTokenStatus(ctx.db, {
        mcpServerTemplateId: input.mcpServerTemplateId,
        userId: ctx.session.user.id,
      });
    }),
});

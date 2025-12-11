import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TransportType } from "@tumiki/db/server";
import { nameValidationSchema } from "@/schema/validation";
import { McpServerTemplateInstanceIdSchema } from "@/schema/ids";
import { connectOAuthMcpServer } from "./connectOAuthMcpServer";
import { handleOAuthCallback } from "./handleOAuthCallback";
import { reauthenticateOAuthMcpServer } from "./reauthenticateOAuthMcpServer";
import { connectOAuthForIntegrated } from "./connectOAuthForIntegrated";

// OAuth認証MCPサーバー接続用の入力スキーマ
export const ConnectOAuthMcpServerInputV2 = z.object({
  // テンプレートIDまたはカスタムURL（いずれか必須）
  templateId: z.string().optional(),
  customUrl: z.string().url().optional(),
  transportType: z.enum(TransportType).optional(),

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

// OAuth 再認証の入力スキーマ
export const ReauthenticateOAuthMcpServerInputV2 = z.object({
  mcpServerTemplateInstanceId: McpServerTemplateInstanceIdSchema,
});

export const ReauthenticateOAuthMcpServerOutputV2 = z.object({
  authorizationUrl: z.string(),
});

// 統合フロー用OAuth認証の入力スキーマ
export const ConnectOAuthForIntegratedInputV2 = z.object({
  templateId: z.string(),
});

export const ConnectOAuthForIntegratedOutputV2 = z.object({
  authorizationUrl: z.string(),
});

export const oauthRouter = createTRPCRouter({
  // OAuth認証MCPサーバー接続
  connectMcpServer: protectedProcedure
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
  handleCallback: protectedProcedure
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

  // OAuth 再認証
  reauthenticateMcpServer: protectedProcedure
    .input(ReauthenticateOAuthMcpServerInputV2)
    .output(ReauthenticateOAuthMcpServerOutputV2)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await reauthenticateOAuthMcpServer(
          tx,
          input,
          ctx.session.user.organizationId,
          ctx.session.user.id,
        );
      });
    }),

  // 統合フロー用OAuth認証開始
  connectMcpServerForIntegrated: protectedProcedure
    .input(ConnectOAuthForIntegratedInputV2)
    .output(ConnectOAuthForIntegratedOutputV2)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await connectOAuthForIntegrated(
          tx,
          input,
          ctx.session.user.organizationId,
          ctx.session.user.id,
        );
      });
    }),
});

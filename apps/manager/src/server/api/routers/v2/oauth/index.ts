import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { TransportType } from "@tumiki/db/server";
import { nameValidationSchema } from "@/schema/validation";
import {
  McpServerIdSchema,
  McpServerTemplateInstanceIdSchema,
} from "@/schema/ids";
import { connectOAuthMcpServer } from "./connectOAuthMcpServer";
import { handleOAuthCallback } from "./handleOAuthCallback";
import { reauthenticateOAuthMcpServer } from "./reauthenticateOAuthMcpServer";
import { reauthenticateByMcpServerId } from "./reauthenticateByMcpServerId";
import { findReusableOAuthTokens } from "./findReusableOAuthTokens";
import { reuseOAuthToken } from "./reuseOAuthToken";
import { createBulkNotifications } from "@/features/notification";

// OAuth認証MCPサーバー接続用の入力スキーマ
export const ConnectOAuthMcpServerInputV2 = z.object({
  // テンプレートIDまたはカスタムURL（いずれか必須）
  templateId: z.string().optional(),
  customUrl: z.string().url().optional(),
  transportType: z.enum(TransportType).optional(),

  // サーバー情報
  name: nameValidationSchema.optional(),
  slug: z
    .string()
    .min(1, "スラッグは必須です")
    .regex(/^[a-z0-9-]+$/, "スラッグは小文字英数字とハイフンのみ使用可能です"),
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
  /** 認証完了後のリダイレクト先（チャット画面等） */
  redirectTo: z.string().optional(),
});

// OAuth 再認証の入力スキーマ
export const ReauthenticateOAuthMcpServerInputV2 = z.object({
  mcpServerTemplateInstanceId: McpServerTemplateInstanceIdSchema,
  /** 認証完了後のリダイレクト先（例: /org-slug/chat/chat-id） */
  redirectTo: z.string().optional(),
});

export const ReauthenticateOAuthMcpServerOutputV2 = z.object({
  authorizationUrl: z.string(),
});

// mcpServerId ベースの再認証（チャット画面からの再認証用）
export const ReauthenticateByMcpServerIdInputV2 = z.object({
  mcpServerId: McpServerIdSchema,
  /** 認証完了後のリダイレクト先（例: /org-slug/chat/chat-id） */
  redirectTo: z.string().optional(),
});

export const ReauthenticateByMcpServerIdOutputV2 = z.object({
  authorizationUrl: z.string(),
});

// 再利用可能トークン検索の入力スキーマ
export const FindReusableOAuthTokensInputV2 = z.object({
  mcpServerTemplateInstanceId: McpServerTemplateInstanceIdSchema,
});

// 再利用可能トークンの情報
const ReusableTokenSchema = z.object({
  tokenId: z.string(),
  mcpServerName: z.string(),
  mcpServerId: z.string(),
  sourceInstanceId: z.string(),
  iconPath: z.string().nullable(),
  expiresAt: z.date().nullable(),
});

export const FindReusableOAuthTokensOutputV2 = z.object({
  tokens: z.array(ReusableTokenSchema),
  mcpServerTemplateId: z.string(),
});

// トークン再利用の入力スキーマ
export const ReuseOAuthTokenInputV2 = z.object({
  /** ソースとなるトークンID */
  sourceTokenId: z.string(),
  /** ターゲットとなるインスタンスID */
  targetInstanceId: McpServerTemplateInstanceIdSchema,
});

export const ReuseOAuthTokenOutputV2 = z.object({
  success: z.boolean(),
  tokenId: z.string(),
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
          ctx.currentOrg.id,
          ctx.session.user.id,
        );
      });
    }),

  // OAuth Callback処理
  handleCallback: protectedProcedure
    .input(HandleOAuthCallbackInputV2)
    .output(HandleOAuthCallbackOutputV2)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.$transaction(
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

      // トランザクション完了後に通知を送信（トランザクション外で実行）
      // 新規サーバー追加時のみ通知（再認証時は通知しない）
      if (result.success && result.isNewServer) {
        void createBulkNotifications(ctx.db, {
          type: "MCP_SERVER_ADDED",
          priority: "LOW",
          title: "MCPサーバーが追加されました",
          message: `「${result.mcpServerName}」が組織に追加されました。`,
          linkUrl: `/${result.organizationSlug}/mcps/${result.mcpServerId}`,
          organizationId: result.organizationId,
          triggeredById: ctx.session.user.id,
        });
      }

      return {
        organizationSlug: result.organizationSlug,
        success: result.success,
        error: result.error,
        redirectTo: result.redirectTo,
      };
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
          ctx.currentOrg.id,
          ctx.session.user.id,
        );
      });
    }),

  // mcpServerId ベースの再認証（チャット画面からの再認証用）
  reauthenticateByMcpServerId: protectedProcedure
    .input(ReauthenticateByMcpServerIdInputV2)
    .output(ReauthenticateByMcpServerIdOutputV2)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await reauthenticateByMcpServerId(
          tx,
          input,
          ctx.currentOrg.id,
          ctx.session.user.id,
        );
      });
    }),

  // 再利用可能なOAuthトークンを検索
  findReusableTokens: protectedProcedure
    .input(FindReusableOAuthTokensInputV2)
    .output(FindReusableOAuthTokensOutputV2)
    .query(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await findReusableOAuthTokens(
          tx,
          input,
          ctx.currentOrg.id,
          ctx.session.user.id,
        );
      });
    }),

  // 既存のOAuthトークンを再利用
  reuseToken: protectedProcedure
    .input(ReuseOAuthTokenInputV2)
    .output(ReuseOAuthTokenOutputV2)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await reuseOAuthToken(
          tx,
          input,
          ctx.currentOrg.id,
          ctx.session.user.id,
        );
      });
    }),
});

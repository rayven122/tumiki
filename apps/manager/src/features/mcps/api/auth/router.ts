import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// 認証タイプ更新
import {
  updateAuthType,
  updateAuthTypeInputSchema,
  updateAuthTypeOutputSchema,
} from "./updateAuthType";

// APIキー生成
import {
  generateApiKey,
  generateApiKeyInputSchema,
  generateApiKeyOutputSchema,
} from "./generateApiKey";

// APIキー一覧取得
import {
  listApiKeys,
  listApiKeysInputSchema,
  listApiKeysOutputSchema,
} from "./listApiKeys";

// APIキー削除
import {
  deleteApiKey,
  deleteApiKeyInputSchema,
  deleteApiKeyOutputSchema,
} from "./deleteApiKey";

// APIキー有効/無効化
import {
  toggleApiKey,
  toggleApiKeyInputSchema,
  toggleApiKeyOutputSchema,
} from "./toggleApiKey";

/**
 * MCPサーバー認証管理ルーター
 * 認証タイプの変更、APIキー管理を担当
 */
export const mcpServerAuthRouter = createTRPCRouter({
  /**
   * 認証タイプを更新
   */
  updateAuthType: protectedProcedure
    .input(updateAuthTypeInputSchema)
    .output(updateAuthTypeOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await updateAuthType(tx, {
          ...input,
          organizationId: ctx.currentOrg.id,
        });
      });
    }),

  /**
   * APIキーを生成
   */
  generateApiKey: protectedProcedure
    .input(generateApiKeyInputSchema)
    .output(generateApiKeyOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await generateApiKey(tx, {
          ...input,
          organizationId: ctx.currentOrg.id,
          userId: ctx.session.user.id,
        });
      });
    }),

  /**
   * APIキー一覧を取得
   */
  listApiKeys: protectedProcedure
    .input(listApiKeysInputSchema)
    .output(listApiKeysOutputSchema)
    .query(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await listApiKeys(tx, {
          ...input,
          organizationId: ctx.currentOrg.id,
          userId: ctx.session.user.id,
        });
      });
    }),

  /**
   * APIキーを削除
   */
  deleteApiKey: protectedProcedure
    .input(deleteApiKeyInputSchema)
    .output(deleteApiKeyOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await deleteApiKey(tx, {
          ...input,
          userId: ctx.session.user.id,
        });
      });
    }),

  /**
   * APIキーを有効/無効化
   */
  toggleApiKey: protectedProcedure
    .input(toggleApiKeyInputSchema)
    .output(toggleApiKeyOutputSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.$transaction(async (tx) => {
        return await toggleApiKey(tx, {
          ...input,
          userId: ctx.session.user.id,
        });
      });
    }),
});

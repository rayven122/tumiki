import { z } from "zod";
import { protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { getProviderAccessToken } from "@tumiki/auth";

/**
 * ユーザーのGoogle OAuthアクセストークンを取得
 */
export const getGoogleAccessTokenProcedure = protectedProcedure
  .input(z.object({}).optional())
  .query(async () => {
    try {
      // getProviderAccessTokenを使用してGoogleのアクセストークンを取得
      const accessToken = await getProviderAccessToken("google");

      if (!accessToken) {
        // アクセストークンが見つからない場合
        return {
          accessToken: null,
          message: "Google認証が必要です。再度ログインしてください。",
          needsReauth: true,
        };
      }

      return {
        accessToken,
        needsReauth: false,
      };
    } catch (error) {
      console.error("Error fetching Google access token:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "アクセストークンの取得に失敗しました",
      });
    }
  });

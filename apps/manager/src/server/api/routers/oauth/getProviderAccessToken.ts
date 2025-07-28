import { TRPCError } from "@trpc/server";
import { OAuthError, OAuthErrorCode } from "@tumiki/auth";
import {
  getProviderAccessToken,
  type OAuthProvider,
} from "@tumiki/auth/server";

/**
 * ユーザーのOAuthアクセストークンを取得（汎用版）
 */
export const getAccessToken = async (provider: OAuthProvider) => {
  try {
    // getProviderAccessTokenを使用してアクセストークンを取得
    const accessToken = await getProviderAccessToken(provider);

    return {
      accessToken,
      needsReauth: false,
    };
  } catch (error) {
    if (error instanceof OAuthError) {
      if (
        error.code === OAuthErrorCode.UNAUTHORIZED ||
        error.code === OAuthErrorCode.NO_ACCESS_TOKEN
      ) {
        // アクセストークンが見つからない場合
        const providerName =
          provider.charAt(0).toUpperCase() + provider.slice(1);
        return {
          accessToken: null,
          message: `${providerName}認証が必要です。再度ログインしてください。`,
          needsReauth: true,
        };
      }
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "アクセストークンの取得に失敗しました",
      cause: error,
    });
  }
};

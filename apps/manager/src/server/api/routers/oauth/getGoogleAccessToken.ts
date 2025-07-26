import { TRPCError } from "@trpc/server";
import {
  getProviderAccessToken,
  OAuthError,
  OAuthErrorCode,
} from "@tumiki/auth";

/**
 * ユーザーのGoogle OAuthアクセストークンを取得
 */
export const getGoogleAccessToken = async () => {
  try {
    // getProviderAccessTokenを使用してGoogleのアクセストークンを取得
    const accessToken = await getProviderAccessToken("google");

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
        return {
          accessToken: null,
          message: "Google認証が必要です。再度ログインしてください。",
          needsReauth: true,
        };
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.error("Error fetching Google access token:", error);
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "アクセストークンの取得に失敗しました",
      cause: error,
    });
  }
};

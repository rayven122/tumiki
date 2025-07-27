import { TRPCError } from "@trpc/server";
import { type z } from "zod";
import { checkOAuthConnection, OAuthError, OAuthErrorCode } from "@tumiki/auth";
import { type GetConnectionStatusInput } from "./index";

export const getConnectionStatus = async ({
  input,
}: {
  input: z.infer<typeof GetConnectionStatusInput>;
}) => {
  const { provider } = input;

  try {
    const isConnected = await checkOAuthConnection(provider);

    return { isConnected };
  } catch (error) {
    if (error instanceof OAuthError) {
      throw new TRPCError({
        code:
          error.code === OAuthErrorCode.UNAUTHORIZED
            ? "UNAUTHORIZED"
            : "INTERNAL_SERVER_ERROR",
        message: error.message,
        cause: error,
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "接続ステータスの確認に失敗しました",
      cause: error,
    });
  }
};

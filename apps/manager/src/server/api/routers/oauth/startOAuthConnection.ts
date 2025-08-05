import { TRPCError } from "@trpc/server";
import { OAuthError } from "@tumiki/auth";
import { startOAuthFlow } from "@tumiki/auth/server";
import { type z } from "zod";
import { type StartOAuthConnectionInput } from "./index";

export const startOAuthConnection = async ({
  input,
}: {
  input: z.infer<typeof StartOAuthConnectionInput>;
}) => {
  const { provider, scopes, returnTo } = input;

  try {
    const loginUrl = await startOAuthFlow(
      {
        provider,
        scopes,
      },
      returnTo,
    );

    return { loginUrl };
  } catch (error) {
    if (error instanceof OAuthError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
        cause: error,
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "OAuth認証フローの開始に失敗しました",
      cause: error,
    });
  }
};

import { TRPCError } from "@trpc/server";
import { startOAuthFlow } from "@tumiki/auth";
import type { StartOAuthConnectionInput } from "./index";

export const startOAuthConnection = async ({
  input,
}: {
  input: StartOAuthConnectionInput;
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
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "OAuth認証フローの開始に失敗しました",
    });
  }
};

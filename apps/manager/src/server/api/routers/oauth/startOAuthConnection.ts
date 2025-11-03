/* eslint-disable */
// @ts-nocheck
// TODO: Rewrite OAuth functionality for Auth.js + Keycloak
import { TRPCError } from "@trpc/server";
import { OAuthError } from "~/lib/oauth-legacy";
import { startOAuthFlow } from "~/auth";
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

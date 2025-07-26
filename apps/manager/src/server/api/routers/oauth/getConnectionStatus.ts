import { TRPCError } from "@trpc/server";
import { checkOAuthConnection } from "@tumiki/auth";
import type { GetConnectionStatusInput } from "./index";

export const getConnectionStatus = async ({
  input,
}: {
  input: GetConnectionStatusInput;
}) => {
  const { provider } = input;

  try {
    const isConnected = await checkOAuthConnection(provider);

    console.log(`Connection status for`, provider, { isConnected });

    return { isConnected };
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "接続ステータスの確認に失敗しました",
    });
  }
};

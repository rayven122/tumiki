import "server-only";

import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db/server";
import type { ProtectedContext } from "../../trpc";
import type { DeleteApiKeyInput } from "./schemas";

type DeleteApiKeyProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof DeleteApiKeyInput>;
};

export const deleteApiKey = async ({ ctx, input }: DeleteApiKeyProps) => {
  if (!ctx.currentOrganizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization not selected",
    });
  }

  // 組織がこのAPIキーの所有者かチェック
  const existingKey = await db.mcpApiKey.findFirst({
    where: {
      id: input.id,
      userMcpServerInstance: {
        organizationId: ctx.currentOrganizationId,
      },
    },
  });

  if (!existingKey) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "API key not found",
    });
  }

  await db.mcpApiKey.delete({
    where: { id: input.id },
  });

  return { success: true };
};

import "server-only";

import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db/server";
import type { ProtectedContext } from "../../trpc";
import type { UpdateApiKeyInput } from "./schemas";

type UpdateApiKeyProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateApiKeyInput>;
};

export const updateApiKey = async ({ ctx, input }: UpdateApiKeyProps) => {
  const { id, ...updateData } = input;

  if (!ctx.currentOrganizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Organization not selected",
    });
  }

  // 組織がこのAPIキーの所有者かチェック
  const existingKey = await db.mcpApiKey.findFirst({
    where: {
      id,
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

  return await db.mcpApiKey.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
};

import "server-only";

import type { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@tumiki/db";
import type { ProtectedContext } from "../../trpc";
import type { UpdateApiKeyInput } from "./schemas";

type UpdateApiKeyProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof UpdateApiKeyInput>;
};

export const updateApiKey = async ({ ctx, input }: UpdateApiKeyProps) => {
  const { id, ...updateData } = input;

  // ユーザーがこのAPIキーの所有者かチェック
  const existingKey = await db.mcpApiKey.findFirst({
    where: {
      id,
      userId: ctx.session.user.id,
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

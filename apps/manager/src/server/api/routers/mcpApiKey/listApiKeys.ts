import "server-only";

import type { z } from "zod";
import { db, type Prisma } from "@tumiki/db/server";
import type { ProtectedContext } from "../../trpc";
import type { ListApiKeysInput } from "./schemas";

type ListApiKeysProps = {
  ctx: ProtectedContext;
  input: z.infer<typeof ListApiKeysInput>;
};

export const listApiKeys = async ({ ctx, input }: ListApiKeysProps) => {
  const where: Prisma.McpApiKeyWhereInput = {
    userId: ctx.session.user.id,
  };

  if (input.userMcpServerInstanceId) {
    where.userMcpServerInstanceId = input.userMcpServerInstanceId;
  }

  return await db.mcpApiKey.findMany({
    where,
    select: {
      id: true,
      name: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      userMcpServerInstance: {
        select: {
          id: true,
          name: true,
        },
      },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

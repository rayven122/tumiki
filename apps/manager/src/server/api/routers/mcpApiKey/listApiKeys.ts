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
    mcpServer: {
      organizationId: ctx.currentOrganizationId,
      deletedAt: null,
    },
  };

  if (input.mcpServerId) {
    where.mcpServerId = input.mcpServerId;
  }

  return await db.mcpApiKey.findMany({
    where,
    select: {
      id: true,
      name: true,
      isActive: true,
      lastUsedAt: true,
      expiresAt: true,
      mcpServer: {
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

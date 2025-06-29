import "server-only";

import { db } from "@tumiki/db";

// APIキー検証関数（Manager用 - 簡易版）
export const validateApiKey = async (providedKey: string) => {
  const apiKey = await db.mcpApiKey.findFirst({
    where: {
      apiKey: providedKey,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      userMcpServerInstance: {
        include: {
          user: true,
          toolGroup: {
            include: {
              toolGroupTools: {
                include: {
                  tool: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!apiKey) {
    return { valid: false, error: "Invalid API key" };
  }

  // 最終使用日時を更新
  await db.mcpApiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    valid: true,
    userMcpServerInstance: apiKey.userMcpServerInstance,
  };
};

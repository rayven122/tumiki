import "server-only";

import { db } from "@tumiki/db/server";

export const findAllWithTools = async () => {
  const mcpServers = await db.mcpServerTemplate.findMany({
    where: {
      visibility: "PUBLIC",
      organizationId: null, // グローバル共通テンプレートのみ
    },
    include: {
      mcpTools: true,
    },
  });

  // ServerCardコンポーネントとの互換性のため、mcpToolsをtoolsにマッピング
  return mcpServers.map((server) => ({
    ...server,
    tools: server.mcpTools,
  }));
};

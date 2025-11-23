import "server-only";

import { db } from "@tumiki/db/server";

/**
 * McpServerTemplateを全件取得（ツール情報を含む）
 * 旧: McpServerテーブルから取得
 * 新: McpServerTemplateテーブルから取得
 */
export const findAllWithTools = async () => {
  const mcpServerTemplates = await db.mcpServerTemplate.findMany({
    where: {
      isPublic: true,
      visibility: "PUBLIC",
    },
    include: {
      mcpTools: true,
    },
  });
  return mcpServerTemplates;
};

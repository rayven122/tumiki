import type { Prisma, AuthType } from "@tumiki/db/prisma";

// MCPサーバーテンプレートの型
export type McpServerTemplateWithTools = Prisma.McpServerTemplateGetPayload<{
  include: { mcpTools: true };
}> & {
  tools: Prisma.McpToolGetPayload<object>[];
};

// モーダルで使用するテンプレートの簡易型
export type SelectableTemplate = {
  id: string;
  name: string;
  description: string;
  iconPath: string | null;
  toolCount: number;
  authType: AuthType;
  envVarKeys: string[];
  url: string;
};

// ドラッグ&ドロップ用のコンテナID
export const DROPPABLE_AVAILABLE = "droppable-template-available";
export const DROPPABLE_SELECTED = "droppable-template-selected";

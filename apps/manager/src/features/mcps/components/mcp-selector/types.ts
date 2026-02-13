import type { RouterOutputs } from "@/trpc/react";

// サーバー一覧の出力型から1サーバーの型を抽出
export type UserMcpServer =
  RouterOutputs["userMcpServer"]["findMcpServers"][number];

// 選択可能なMCPサーバーの型
export type SelectableMcp = {
  id: string;
  name: string;
  description: string;
  iconPath: string | null;
  toolCount: number;
  templateInstances: UserMcpServer["templateInstances"];
};

// ドラッグ&ドロップ用のコンテナID
export const DROPPABLE_AVAILABLE = "droppable-available";
export const DROPPABLE_SELECTED = "droppable-selected";

// ユーザーサーバーをSelectableMcp形式に変換
export const convertToSelectableMcp = (
  server: UserMcpServer,
): SelectableMcp => {
  const toolCount = server.templateInstances.reduce(
    (sum, instance) => sum + instance.tools.length,
    0,
  );

  const iconPath =
    server.iconPath ??
    server.templateInstances[0]?.mcpServerTemplate.iconPath ??
    null;

  return {
    id: server.id,
    name: server.name,
    description: server.description ?? "",
    iconPath,
    toolCount,
    templateInstances: server.templateInstances,
  };
};

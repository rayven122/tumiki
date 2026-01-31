import type { RouterOutputs } from "@/trpc/react";

// サーバー一覧の出力型から1サーバーの型を抽出
export type UserMcpServer =
  RouterOutputs["v2"]["userMcpServer"]["findMcpServers"][number];

// モーダルで使用するMCPサーバーの簡易型
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

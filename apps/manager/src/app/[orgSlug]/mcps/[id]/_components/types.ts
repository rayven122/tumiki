import type { RouterOutputs } from "~/trpc/react";

// サーバー詳細の型
export type UserMcpServerDetail =
  RouterOutputs["v2"]["userMcpServer"]["findById"];

// リクエスト統計の型
export type RequestStats =
  RouterOutputs["v2"]["userMcpServer"]["getRequestStats"];

// リクエストログの型
export type RequestLog =
  RouterOutputs["v2"]["userMcpServer"]["findRequestLogs"]["data"][number];

// ツール統計の型
export type ToolStats =
  RouterOutputs["v2"]["userMcpServer"]["getToolStats"][number];

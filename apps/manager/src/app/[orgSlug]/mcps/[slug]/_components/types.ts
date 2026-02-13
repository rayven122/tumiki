import type { RouterOutputs } from "~/trpc/react";

// サーバー詳細の型
export type UserMcpServerDetail = RouterOutputs["userMcpServer"]["findById"];

// リクエスト統計の型
export type RequestStats =
  RouterOutputs["userMcpServerRequestLog"]["getRequestStats"];

// リクエストログの型
export type RequestLog =
  RouterOutputs["userMcpServerRequestLog"]["findRequestLogs"]["data"][number];

// ツール統計の型
export type ToolStats = RouterOutputs["userMcpServer"]["getToolStats"][number];

import type { RouterOutputs } from "@/trpc/react";

/**
 * 新スキーマ：UserMcpServerInstance → McpServer
 * - toolGroup削除
 * - availableToolsのmcpServer → mcpServerTemplate
 * - userMcpServerConfigId → mcpConfigId
 */
export type UserMcpServerInstance = NonNullable<
  RouterOutputs["userMcpServerInstance"]["findById"]
>;

export type RequestStats =
  | RouterOutputs["userMcpServerInstance"]["getRequestStats"]
  | undefined;

export type RequestLogs =
  | RouterOutputs["userMcpServerInstance"]["findRequestLogs"]
  | undefined;

import { atom } from "jotai";

// MCPサーバーIDから情報へのマッピング
export type McpServerInfo = {
  name: string;
  iconPath?: string;
};

// Record<serverId, McpServerInfo> 形式で保持
export const mcpServerMapAtom = atom<Record<string, McpServerInfo>>({});

/**
 * IDからサーバー名を解決するヘルパー関数
 * サーバー情報がない場合はフォールバックとしてIDをそのまま返す
 */
export const resolveServerName = (
  serverMap: Record<string, McpServerInfo>,
  serverId: string,
): string => {
  return serverMap[serverId]?.name ?? serverId;
};

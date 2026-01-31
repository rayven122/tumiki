import { useMemo } from "react";
import type { RouterOutputs } from "@/trpc/react";

type OfficialServers = RouterOutputs["v2"]["userMcpServer"]["findMcpServers"];

export type ConnectionConfigInstance =
  NonNullable<OfficialServers>[number]["templateInstances"][number];

/**
 * 接続設定リストを取得するカスタムフック
 *
 * 全サーバーのtemplateInstancesをflatMapで抽出し、
 * null/undefinedを除外して型安全な配列として返す
 */
export const useConnectionConfigs = (
  officialServers: OfficialServers | undefined,
): ConnectionConfigInstance[] => {
  return useMemo(() => {
    if (!officialServers) return [];

    return officialServers
      .flatMap((server) => server.templateInstances)
      .filter((instance): instance is ConnectionConfigInstance =>
        Boolean(instance),
      );
  }, [officialServers]);
};

/**
 * IDから接続設定を検索するヘルパー関数
 */
export const findConnectionConfig = (
  configs: ConnectionConfigInstance[],
  instanceId: string,
): ConnectionConfigInstance | undefined => {
  return configs.find((config) => config.id === instanceId);
};

/**
 * 接続設定の表示名を取得するヘルパー関数
 */
export const getConnectionConfigDisplayName = (
  config: ConnectionConfigInstance,
): string => {
  // normalizedNameが優先、なければmcpServerTemplate.nameを使用
  return config.normalizedName || config.mcpServerTemplate.name;
};

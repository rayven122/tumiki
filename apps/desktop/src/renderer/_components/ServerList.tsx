import React from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { mcpServersAtom } from "../store/atoms";
import { ServerCard } from "./ServerCard";

export const ServerList = (): React.ReactElement => {
  const servers = useAtomValue(mcpServersAtom);
  const setServers = useSetAtom(mcpServersAtom);

  const handleStart = (serverId: string): void => {
    setServers((prev) =>
      prev.map((s) =>
        s.id === serverId ? { ...s, status: "running" as const } : s,
      ),
    );
  };

  const handleStop = (serverId: string): void => {
    setServers((prev) =>
      prev.map((s) =>
        s.id === serverId ? { ...s, status: "stopped" as const } : s,
      ),
    );
  };

  if (servers.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
        <p className="text-sm text-gray-600">MCPサーバーが登録されていません</p>
        <p className="mt-2 text-xs text-gray-500">
          サーバーを追加するには、設定ページから追加してください
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {servers.map((server) => (
        <ServerCard
          key={server.id}
          server={server}
          onStart={handleStart}
          onStop={handleStop}
        />
      ))}
    </div>
  );
};

import React from "react";
import { useAtomValue } from "jotai";
import { mcpServersAtom } from "../store/atoms";

export const StatusBar = (): React.ReactElement => {
  const servers = useAtomValue(mcpServersAtom);
  const runningCount = servers.filter((s) => s.status === "running").length;

  return (
    <div className="border-t border-gray-200 bg-gray-50 px-6 py-2">
      <div className="flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center space-x-4">
          <span>
            MCPサーバー: {runningCount} / {servers.length} 起動中
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <span>準備完了</span>
        </div>
      </div>
    </div>
  );
};

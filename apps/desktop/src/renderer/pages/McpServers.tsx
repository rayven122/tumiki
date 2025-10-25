import React from "react";
import { ServerList } from "../_components/ServerList";

export const McpServers = (): React.ReactElement => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">MCPサーバー</h2>
        <p className="mt-1 text-sm text-gray-600">
          利用可能なMCPサーバーの管理と操作
        </p>
      </div>

      <ServerList />
    </div>
  );
};

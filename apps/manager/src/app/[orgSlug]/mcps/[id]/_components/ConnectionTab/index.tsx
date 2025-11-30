"use client";

import { AuthSettings } from "../OverviewTab/AuthSettings";
import { ConnectionSettings } from "../OverviewTab/ConnectionSettings";
import type { UserMcpServerDetail } from "../types";
import type { McpServerId } from "@/schema/ids";

type ConnectionTabProps = {
  server: UserMcpServerDetail;
  serverId: McpServerId;
};

export const ConnectionTab = ({ server, serverId }: ConnectionTabProps) => {
  return (
    <div className="space-y-6">
      {/* 認証設定と接続設定を横並び */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AuthSettings server={server} serverId={serverId} />
        <ConnectionSettings server={server} />
      </div>
    </div>
  );
};

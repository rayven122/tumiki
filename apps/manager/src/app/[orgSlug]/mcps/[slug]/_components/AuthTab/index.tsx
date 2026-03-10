"use client";

import { AuthSettings } from "../OverviewTab/AuthSettings";
import type { McpServerId } from "@/schema/ids";
import type { RouterOutputs } from "@/trpc/react";

type AuthTabProps = {
  server: NonNullable<RouterOutputs["userMcpServer"]["findById"]>;
  serverId: McpServerId;
};

export const AuthTab = ({ server, serverId }: AuthTabProps) => {
  return (
    <div className="space-y-6">
      <AuthSettings server={server} serverId={serverId} />
    </div>
  );
};

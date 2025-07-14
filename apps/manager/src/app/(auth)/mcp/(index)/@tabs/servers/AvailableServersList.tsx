"use client";

import { Suspense } from "react";
import { api } from "@/trpc/react";
import { ServerCard } from "../_components/ServerCard";
import { ServerCardSkeleton } from "../_components/ServerCard/ServerCardSkeleton";
import { AddRemoteServerCard } from "./add/AddRemoteServerCard";
import { useState } from "react";
import { CreateMcpServerDialog } from "./add/CreateMcpServerDialog";

const AsyncAvailableServersList = () => {
  const [mcpServers] = api.mcpServer.findAll.useSuspenseQuery();
  const [userOfficialServers] =
    api.userMcpServerInstance.findOfficialServers.useSuspenseQuery();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // 既に追加済みのサーバーIDを取得
  const addedServerIds = new Set(
    userOfficialServers
      .flatMap((instance) =>
        instance.userMcpServers.map(
          (server) => (server as { mcpServerId?: string }).mcpServerId,
        ),
      )
      .filter((id): id is string => Boolean(id)),
  );

  // 未追加のサーバーのみフィルタリング
  const availableServers = mcpServers.filter(
    (server) => !addedServerIds.has(server.id),
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <AddRemoteServerCard onConnect={() => setCreateDialogOpen(true)} />
        {availableServers.map((mcpServer) => (
          <ServerCard key={mcpServer.id} mcpServer={mcpServer} />
        ))}
      </div>

      <CreateMcpServerDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  );
};

function AvailableServersListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <ServerCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function AvailableServersList() {
  return (
    <Suspense fallback={<AvailableServersListSkeleton />}>
      <AsyncAvailableServersList />
    </Suspense>
  );
}

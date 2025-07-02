"use client";

import type React from "react";
import { Suspense } from "react";

import { ServerCardSkeleton } from "../../_components/ServerCard/ServerCardSkeleton";
import { ServerCard } from "../../_components/ServerCard";
import { api } from "@/trpc/react";

const AsyncServerList = () => {
  const [mcpServers] = api.mcpServer.findAll.useSuspenseQuery();
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {mcpServers.map((mcpServer) => (
        <ServerCard key={mcpServer.id} mcpServer={mcpServer} />
      ))}
    </div>
  );
};

const ServerListSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <ServerCardSkeleton key={i} />
      ))}
    </div>
  );
};

export function ServerList() {
  return (
    <Suspense fallback={<ServerListSkeleton />}>
      <AsyncServerList />
    </Suspense>
  );
}

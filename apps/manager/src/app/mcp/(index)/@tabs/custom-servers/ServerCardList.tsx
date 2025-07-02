"use client";

import { UserMcpServerCard } from "../_components/UserMcpServerCard";
import { Suspense } from "react";
import { UserMcpServerCardSkeleton } from "../_components/UserMcpServerCard/UserMcpServerCardSkeleton";
import { api } from "@/trpc/react";

const AsyncServerCardList = () => {
  const [userCustomServers] =
    api.userMcpServerInstance.findCustomServers.useSuspenseQuery();
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {userCustomServers.map((server) => (
        <UserMcpServerCard key={server.id} serverInstance={server} />
      ))}
    </div>
  );
};

function ServerCardListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <UserMcpServerCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ServerCardList() {
  return (
    <Suspense fallback={<ServerCardListSkeleton />}>
      <AsyncServerCardList />
    </Suspense>
  );
}

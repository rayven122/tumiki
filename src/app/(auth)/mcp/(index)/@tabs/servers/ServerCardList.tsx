import { api } from "@/trpc/server";
import { UserMcpServerCard } from "../../../_components/UserMcpServerCard";

import { Suspense } from "react";

import { UserMcpServerCardSkeleton } from "../../../_components/UserMcpServerCard/UserMcpServerCardSkeleton";

const AsyncServerCardList = async () => {
  const userMcpServers = await api.userMcpServer.findAllWithMcpServerTools();
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {userMcpServers.map((userMcpServer) => (
        <UserMcpServerCard
          key={userMcpServer.id}
          userMcpServer={userMcpServer}
        />
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

import { api } from "@/trpc/server";

import { Suspense } from "react";
import { UserMcpServerCardSkeleton } from "../_components/UserMcpServerCard/UserMcpServerCardSkeleton";
import { UserMcpServerCard } from "../_components/UserMcpServerCard";

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

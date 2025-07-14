"use client";

import { UserMcpServerCard } from "../_components/UserMcpServerCard";
import { Suspense } from "react";
import { UserMcpServerCardSkeleton } from "../_components/UserMcpServerCard/UserMcpServerCardSkeleton";
import { api } from "@/trpc/react";

const AsyncServerCardList = () => {
  const [userCustomServers] =
    api.userMcpServerInstance.findCustomServers.useSuspenseQuery();
  const utils = api.useUtils();
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {userCustomServers.map((server) => (
        <UserMcpServerCard
          key={server.id}
          serverInstance={server}
          revalidate={async () =>
            await utils.userMcpServerInstance.findCustomServers.invalidate()
          }
        />
      ))}
    </div>
  );
};

function ServerCardListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

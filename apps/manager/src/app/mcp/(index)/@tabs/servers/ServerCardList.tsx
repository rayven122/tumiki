"use client";

import { Suspense } from "react";
import { UserMcpServerCardSkeleton } from "../_components/UserMcpServerCard/UserMcpServerCardSkeleton";
import { UserMcpServerCard } from "../_components/UserMcpServerCard";
import { api } from "@/trpc/react";

const AsyncServerCardList = () => {
  const [userOfficialServers] =
    api.userMcpServerInstance.findOfficialServers.useSuspenseQuery();
  const utils = api.useUtils();
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {userOfficialServers.map((server) => (
        <UserMcpServerCard
          key={server.id}
          serverInstance={server}
          revalidate={() =>
            utils.userMcpServerInstance.findOfficialServers.invalidate()
          }
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

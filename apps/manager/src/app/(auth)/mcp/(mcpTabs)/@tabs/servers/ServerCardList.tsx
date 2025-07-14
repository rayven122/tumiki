"use client";

import { Suspense } from "react";
import { UserMcpServerCardSkeleton } from "../_components/UserMcpServerCard/UserMcpServerCardSkeleton";
import { UserMcpServerCard } from "../_components/UserMcpServerCard";
import { api } from "@/trpc/react";
import { ServerStatus } from "@tumiki/db/prisma";

const AsyncServerCardList = () => {
  const [userOfficialServers] =
    api.userMcpServerInstance.findOfficialServers.useSuspenseQuery();
  const utils = api.useUtils();

  // ステータスでソート: RUNNING -> その他の順番
  const sortedServers = [...userOfficialServers].sort((a, b) => {
    if (
      a.serverStatus === ServerStatus.RUNNING &&
      b.serverStatus !== ServerStatus.RUNNING
    ) {
      return -1; // aを上に
    }
    if (
      a.serverStatus !== ServerStatus.RUNNING &&
      b.serverStatus === ServerStatus.RUNNING
    ) {
      return 1; // bを上に
    }
    return 0; // 同じステータスなら順序を変更しない
  });

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {sortedServers.map((server) => (
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
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
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

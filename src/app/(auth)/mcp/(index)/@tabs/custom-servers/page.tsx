import { CreateCustomServerButton } from "./_components/CreateCustomServerButton";
import { McpTabs } from "../_components/McpTabs";
import { api } from "@/trpc/server";
import { UserMcpServerCard } from "../_components/UserMcpServerCard";
import { Suspense } from "react";
import { UserMcpServerCardSkeleton } from "../_components/UserMcpServerCard/UserMcpServerCardSkeleton";

const AsyncServerCardList = async () => {
  const userCustomServers = await api.userMcpServerInstance.findCustomServers();
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

export default function CustomServersPage() {
  return (
    <McpTabs
      activeTab="custom-servers"
      addButton={<CreateCustomServerButton />}
    >
      <Suspense fallback={<ServerCardListSkeleton />}>
        <AsyncServerCardList />
      </Suspense>
    </McpTabs>
  );
}

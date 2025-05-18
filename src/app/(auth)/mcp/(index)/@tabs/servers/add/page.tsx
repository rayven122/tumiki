import type React from "react";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ServerCard } from "../../../../_components/ServerCard";
import { ServerCardSkeleton } from "../../../../_components/ServerCard/ServerCardSkeleton";
import { api } from "@/trpc/server";

const ServerList = async () => {
  const mcpServers = await api.mcpServer.findAll();
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

export default function AddServerPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-6 flex items-center">
        <Link href="/mcp-manager/servers" className="mr-4">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">MCPサーバーの追加</h1>
      </header>

      <Suspense fallback={<ServerListSkeleton />}>
        <ServerList />
      </Suspense>
    </div>
  );
}

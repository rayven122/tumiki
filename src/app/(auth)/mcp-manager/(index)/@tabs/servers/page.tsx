import { api } from "@/trpc/server";
import { UserMcpServerCard } from "../../../_components/UserMcpServerCard";
import { McpTabs } from "../_components/McpTabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Suspense } from "react";
import { ServerCardListSkeleton } from "./ServerCardListSkeleton";

const ServerCardList = async () => {
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

export default function ServersPage() {
  return (
    <McpTabs
      activeTab="servers"
      addButton={
        <Link href="/mcp-manager/servers/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規MCPサーバー追加
          </Button>
        </Link>
      }
    >
      <Suspense fallback={<ServerCardListSkeleton />}>
        <ServerCardList />
      </Suspense>
    </McpTabs>
  );
}

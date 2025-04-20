import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserMcpServerCard } from "./_components/UserMcpServerCard";

import { api } from "@/trpc/server";

export default async function MCPServersPage() {
  const userMcpServers = await api.userMcpServer.findAllWithMcpServerTools();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">接続済みMCPサーバー</h1>
        <Link href="/servers/add">
          <Button>新規MCPサーバー追加</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {userMcpServers.map((userMcpServer) => (
          <UserMcpServerCard
            key={userMcpServer.id}
            userMcpServer={userMcpServer}
          />
        ))}
      </div>
    </div>
  );
}

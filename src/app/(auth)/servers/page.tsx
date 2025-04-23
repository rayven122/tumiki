import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserMcpServerCard } from "./_components/UserMcpServerCard";
import { api } from "@/trpc/server";
import { UserMcpServerCardSkeleton } from "./_components/UserMcpServerCard/UserMcpServerCardSkeleton";
import { Suspense } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Key, Layers, Plus, Server } from "lucide-react";
import { ApiKeysTab } from "./_components/ApiKeysTab";

const UserMcpServerList = async () => {
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

const UserMcpServerListSkeleton = () => {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <UserMcpServerCardSkeleton key={i} />
      ))}
    </div>
  );
};

export default function MCPServersPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">MCPサーバー管理</h1>
      </div>

      <Tabs defaultValue="servers" className="w-full">
        <div className="mb-4 flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="servers" className="flex items-center">
              <Server className="mr-2 h-4 w-4" />
              サーバー
            </TabsTrigger>
            <TabsTrigger value="tool-groups" className="flex items-center">
              <Layers className="mr-2 h-4 w-4" />
              ツールグループ
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center">
              <Key className="mr-2 h-4 w-4" />
              アクセス
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <TabsContent value="servers" className="m-0">
              <Link href="/servers/add">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  新規MCPサーバー追加
                </Button>
              </Link>
            </TabsContent>
            <TabsContent value="tool-groups" className="m-0">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                新規ツールグループ作成
              </Button>
            </TabsContent>
            <TabsContent value="access" className="m-0">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                新規API Key作成
              </Button>
            </TabsContent>
          </div>
        </div>

        <TabsContent value="servers">
          <Suspense fallback={<UserMcpServerListSkeleton />}>
            <UserMcpServerList />
          </Suspense>
        </TabsContent>

        <TabsContent value="access">
          <ApiKeysTab />
        </TabsContent>

        <TabsContent value="tool-groups">
          <div className="rounded-lg border p-4">
            <p className="text-muted-foreground text-center">
              ツールグループ管理機能は現在開発中です。
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

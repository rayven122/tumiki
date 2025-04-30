import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Key, Layers, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus } from "lucide-react";
import { CreateApiKeyButton } from "./@access/_components/CreateApiKeyButton";

export default function ServersLayout({
  servers,
  toolGroups,
  access,
}: {
  children: React.ReactNode;
  servers: React.ReactNode;
  toolGroups: React.ReactNode;
  access: React.ReactNode;
}) {
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
              <CreateApiKeyButton />
            </TabsContent>
          </div>
        </div>

        <TabsContent value="servers">{servers}</TabsContent>
        <TabsContent value="access">{access}</TabsContent>
        <TabsContent value="tool-groups">{toolGroups}</TabsContent>
      </Tabs>
    </div>
  );
}

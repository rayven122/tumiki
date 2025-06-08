import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Database, Layers, Server } from "lucide-react";

import Link from "next/link";

import type { ReactNode } from "react";

export function McpTabs({
  activeTab,
  addButton,
  children,
}: {
  activeTab: "servers" | "custom-servers" | "tool-groups";
  addButton?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Tabs value={activeTab} className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <TabsList>
          <Link href="/mcp/servers">
            <TabsTrigger value="servers" className="flex items-center">
              <Server className="mr-2 h-4 w-4" />
              サーバー
            </TabsTrigger>
          </Link>
          <Link href="/mcp/custom-servers">
            <TabsTrigger value="custom-servers" className="flex items-center">
              <Database className="mr-2 h-4 w-4" />
              カスタムサーバー
            </TabsTrigger>
          </Link>
          <Link href="/mcp/tool-groups">
            <TabsTrigger value="tool-groups" className="flex items-center">
              <Layers className="mr-2 h-4 w-4" />
              ツールグループ
            </TabsTrigger>
          </Link>
        </TabsList>

        <div className="flex gap-2">
          <TabsContent value={activeTab} className="m-0">
            {addButton}
          </TabsContent>
        </div>
      </div>

      <TabsContent value={activeTab}>{children}</TabsContent>
    </Tabs>
  );
}

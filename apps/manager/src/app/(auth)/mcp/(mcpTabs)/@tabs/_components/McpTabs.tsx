import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Database, Layers, Server } from "lucide-react";
import { cn } from "@/lib/utils";

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
            <TabsTrigger
              value="servers"
              className={cn(
                "flex items-center transition-colors duration-200",
                "data-[state=active]:bg-[#874FFF] data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:shadow-lg",
                "hover:bg-purple-50 hover:text-[#874FFF]",
                "text-gray-600",
              )}
            >
              <Server className="mr-2 h-4 w-4" />
              サーバー
            </TabsTrigger>
          </Link>
          <Link href="/mcp/custom-servers">
            <TabsTrigger
              value="custom-servers"
              className={cn(
                "flex items-center transition-colors duration-200",
                "data-[state=active]:bg-[#874FFF] data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:shadow-lg",
                "hover:bg-purple-50 hover:text-[#874FFF]",
                "text-gray-600",
              )}
            >
              <Database className="mr-2 h-4 w-4" />
              カスタムサーバー
            </TabsTrigger>
          </Link>
          <Link href="/mcp/tool-groups">
            <TabsTrigger
              value="tool-groups"
              className={cn(
                "flex items-center transition-colors duration-200",
                "data-[state=active]:bg-[#874FFF] data-[state=active]:font-semibold data-[state=active]:text-white data-[state=active]:shadow-lg",
                "hover:bg-purple-50 hover:text-[#874FFF]",
                "text-gray-600",
              )}
            >
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

import { McpTabs } from "../_components/McpTabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { ServerCardList } from "./ServerCardList";

export default function ServersPage() {
  return (
    <McpTabs
      activeTab="servers"
      addButton={
        <Link href="/mcp/servers/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            新規MCPサーバー追加
          </Button>
        </Link>
      }
    >
      <ServerCardList />
    </McpTabs>
  );
}

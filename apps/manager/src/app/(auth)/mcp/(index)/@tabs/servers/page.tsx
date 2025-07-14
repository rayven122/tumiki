import { McpTabs } from "../_components/McpTabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import { ServerCardList } from "./ServerCardList";
import { AvailableServersList } from "./AvailableServersList";

export default function ServersPage() {
  return (
    <McpTabs
      activeTab="servers"
      addButton={
        <Link href="/mcp/servers/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            MCPサーバーを追加
          </Button>
        </Link>
      }
    >
      <div className="space-y-8">
        {/* 追加済みMCPサーバー一覧 */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">接続済みMCPサーバー</h2>
          <ServerCardList />
        </div>

        {/* 追加可能なMCPサーバー一覧 */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">追加可能なMCPサーバー</h2>
          <AvailableServersList />
        </div>
      </div>
    </McpTabs>
  );
}

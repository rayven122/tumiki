import { Button } from "@/components/ui/button";
import { McpTabs } from "../_components/McpTabs";
import { Plus } from "lucide-react";

export default function ToolGroupsPage() {
  return (
    <McpTabs
      activeTab="tool-groups"
      addButton={
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          新規ツールグループ作成
        </Button>
      }
    >
      <div className="rounded-lg border p-4">
        <p className="text-muted-foreground text-center">
          ツールグループ管理機能は現在開発中です。
        </p>
      </div>
    </McpTabs>
  );
}

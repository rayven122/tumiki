import { Badge } from "@/components/ui/badge";
import type { Tool, UserToolGroup } from "@prisma/client";
import { ToolBadge } from "./ToolBadge";

type ToolItem = Pick<Tool, "id" | "name"> & { userMcpServerName?: string };
type ToolGroupItem = Pick<UserToolGroup, "id" | "name">;

type ToolBadgeListProps = {
  tools?: ToolItem[];
  toolGroups?: ToolGroupItem[];
  maxDisplay?: number;
};

export function ToolBadgeList({
  tools = [],
  toolGroups = [],
  maxDisplay = 5,
}: ToolBadgeListProps) {
  const allItems = [
    ...toolGroups.map((group) => ({ type: "toolGroup" as const, item: group })),
    ...tools.map((tool) => ({ type: "tool" as const, item: tool })),
  ];

  const displayedItems = allItems.slice(0, maxDisplay);
  const remainingCount = allItems.length - maxDisplay;

  return (
    <div className="flex flex-wrap gap-2">
      {displayedItems.map(({ type, item }, index) =>
        type === "tool" ? (
          <ToolBadge
            key={`${item.id}-${item.userMcpServerName}-${index}`}
            type="tool"
            tool={item}
            userMcpServerName={item.userMcpServerName}
          />
        ) : (
          <ToolBadge
            key={`${item.id}-${index}`}
            type="toolGroup"
            toolGroup={item}
          />
        ),
      )}
      {remainingCount > 0 && (
        <Badge variant="outline" className="bg-slate-100">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}

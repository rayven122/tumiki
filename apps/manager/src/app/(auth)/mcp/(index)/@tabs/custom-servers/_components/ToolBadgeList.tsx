import { Badge } from "@/components/ui/badge";
import type { Tool, UserToolGroup } from "@tumiki/db/prisma";
import { ToolBadge } from "./ToolBadge";
import { useState } from "react";

type ToolItem = Pick<Tool, "id" | "name" | "description"> & {
  userMcpServerName?: string;
};
type ToolGroupItem = Pick<UserToolGroup, "id" | "name" | "description">;

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
  const [showAll, setShowAll] = useState(false);

  const allItems = [
    ...toolGroups.map((group) => ({ type: "toolGroup" as const, item: group })),
    ...tools.map((tool) => ({ type: "tool" as const, item: tool })),
  ];

  const displayedItems = showAll ? allItems : allItems.slice(0, maxDisplay);
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
      {remainingCount > 0 && !showAll && (
        <Badge
          variant="outline"
          className="cursor-pointer bg-slate-100 transition-colors hover:bg-slate-200"
          onClick={() => setShowAll(true)}
        >
          +{remainingCount}
        </Badge>
      )}
      {showAll && remainingCount > 0 && (
        <Badge
          variant="outline"
          className="cursor-pointer bg-slate-100 transition-colors hover:bg-slate-200"
          onClick={() => setShowAll(false)}
        >
          折りたたむ
        </Badge>
      )}
    </div>
  );
}

import { Badge } from "@/components/ui/badge";
import type { Tool, ToolGroup } from "@prisma/client";

type ToolBadgeListProps =
  | {
      type: "tool";
      tool: Pick<Tool, "id" | "name">;
      toolGroup?: never;
      userMcpServerName: string;
    }
  | {
      type: "toolGroup";
      toolGroup: Pick<ToolGroup, "id" | "name">;
      tool?: never;
      userMcpServerName?: never;
    };

export function ToolBadge({
  type,
  tool,
  toolGroup,
  userMcpServerName,
}: ToolBadgeListProps) {
  if (type === "toolGroup") {
    return (
      <Badge
        key={toolGroup.id}
        variant="outline"
        className="border-purple-200 bg-purple-50 text-purple-700"
      >
        {toolGroup.name}
      </Badge>
    );
  }

  return (
    <Badge
      key={tool.id}
      variant="outline"
      className="border-green-200 bg-green-50 text-green-700"
    >
      {userMcpServerName}: {tool.name}
    </Badge>
  );
}

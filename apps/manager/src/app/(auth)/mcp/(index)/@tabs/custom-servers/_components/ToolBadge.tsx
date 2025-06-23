import { Badge } from "@/components/ui/badge";
import type { Tool, UserToolGroup } from "@tumiki/db/prisma";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ToolBadgeListProps =
  | {
      type: "tool";
      tool: Pick<Tool, "id" | "name" | "description">;
      toolGroup?: never;
      userMcpServerName?: string;
    }
  | {
      type: "toolGroup";
      toolGroup: Pick<UserToolGroup, "id" | "name" | "description">;
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
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className="border-purple-200 bg-purple-50 text-purple-700"
          >
            {toolGroup.name}
          </Badge>
        </TooltipTrigger>
        {toolGroup.description && (
          <TooltipContent className="max-w-[250px]">
            <p>{toolGroup.description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="border-green-200 bg-green-50 text-green-700"
        >
          {userMcpServerName ? `${userMcpServerName}:` : ""} {tool.name}
        </Badge>
      </TooltipTrigger>
      {tool.description && (
        <TooltipContent className="max-w-[250px]">
          <p>{tool.description}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
}

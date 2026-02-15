import { Badge } from "@tumiki/ui/badge";
import type { Prisma } from "@tumiki/db/prisma";
import { EntityIcon } from "@/features/shared/components/EntityIcon";

type McpServerTemplate = Prisma.McpServerTemplateGetPayload<object>;

type ServerInfoSectionProps = {
  mcpServer: McpServerTemplate;
};

export const ServerInfoSection = ({ mcpServer }: ServerInfoSectionProps) => {
  const getEnvVarBadgeText = () => {
    if (mcpServer.envVarKeys.length === 0) {
      return "設定不要";
    }
    if (mcpServer.envVarKeys.length > 1) {
      return `${mcpServer.envVarKeys.length}つのAPIトークンが必要`;
    }
    return "APIトークンが必要";
  };

  return (
    <div className="flex items-center">
      <EntityIcon
        iconPath={mcpServer.iconPath}
        fallbackUrl={mcpServer.url}
        type="mcp"
        size="sm"
        alt={mcpServer.name}
        className="mr-3"
      />
      <div className="min-w-0">
        <h2 className="font-medium">{mcpServer.name}</h2>
        <Badge variant="outline" className="mt-1 text-xs">
          {getEnvVarBadgeText()}
        </Badge>
      </div>
    </div>
  );
};

import { Badge } from "@/components/ui/badge";
import type { Prisma } from "@tumiki/db/prisma";
import { McpServerIcon } from "../McpServerIcon";

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
      <div className="mr-3 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md border p-2">
        <McpServerIcon
          iconPath={mcpServer.iconPath}
          fallbackUrl={mcpServer.url}
          alt={mcpServer.name}
          size={24}
        />
      </div>
      <div className="min-w-0">
        <h2 className="font-medium">{mcpServer.name}</h2>
        <Badge variant="outline" className="mt-1 text-xs">
          {getEnvVarBadgeText()}
        </Badge>
      </div>
    </div>
  );
};

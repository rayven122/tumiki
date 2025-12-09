import Image from "next/image";
import { Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FaviconImage } from "@/components/ui/FaviconImage";
import type { Prisma } from "@tumiki/db/prisma";

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
        {mcpServer.iconPath ? (
          <Image
            src={mcpServer.iconPath}
            alt={mcpServer.name}
            width={24}
            height={24}
            className="h-6 w-6"
          />
        ) : (
          <FaviconImage
            url={mcpServer.url}
            alt={mcpServer.name}
            size={24}
            className="h-6 w-6"
            fallback={<Server className="h-6 w-6 text-gray-500" />}
          />
        )}
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

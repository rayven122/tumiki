"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@tumiki/ui/card";
import { Badge } from "@tumiki/ui/badge";
import { Server, Loader2, AlertCircle } from "lucide-react";
import { api } from "@/trpc/react";
import { EntityIcon } from "@/features/shared/components/EntityIcon";

// ステータスバッジのバリアント定義
const STATUS_BADGE_CONFIG = {
  RUNNING: { label: "稼働中", variant: "default" },
  STOPPED: { label: "停止", variant: "secondary" },
  ERROR: { label: "エラー", variant: "destructive" },
  PENDING: { label: "準備中", variant: "outline" },
} as const satisfies Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
>;

export const McpServerHealth = () => {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { data, isLoading } = api.dashboard.getMcpServerHealth.useQuery();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Server className="h-4 w-4" />
          MCPサーバーヘルス
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-3 pb-3">
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </div>
        )}

        {!isLoading && (!data?.servers || data.servers.length === 0) && (
          <div className="text-muted-foreground flex items-center gap-2 py-4 text-center text-sm">
            <AlertCircle className="mx-auto h-4 w-4" />
            <span>MCPサーバーがありません</span>
          </div>
        )}

        {data?.servers.map((server) => {
          const badgeConfig = STATUS_BADGE_CONFIG[server.serverStatus];

          return (
            <Link
              key={server.mcpServerId}
              href={`/${orgSlug}/mcps/${server.slug}`}
              className="hover:bg-accent flex items-center gap-3 rounded-lg border p-3 transition-all duration-150"
            >
              <EntityIcon
                iconPath={server.iconPath}
                type="mcp"
                size="sm"
                alt={server.name}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-foreground truncate text-sm font-medium">
                    {server.name}
                  </p>
                  <Badge variant={badgeConfig.variant} className="shrink-0">
                    {badgeConfig.label}
                  </Badge>
                </div>
                <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                  <span>{server.requestCount}件のリクエスト</span>
                  {server.errorRate > 0 && (
                    <span className="text-destructive">
                      エラー率 {server.errorRate}%
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
};

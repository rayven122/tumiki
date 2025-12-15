"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RouterOutputs } from "@/trpc/react";
import {
  useConnectionConfigs,
  getConnectionConfigDisplayName,
} from "../_hooks/useConnectionConfigs";

type OfficialServers =
  RouterOutputs["v2"]["userMcpServer"]["findOfficialServers"];

type ReviewStepProps = {
  serverName: string;
  serverDescription: string;
  officialServers: OfficialServers | undefined;
  selectedInstanceIds: string[];
  toolSelections: Record<string, string[]>;
};

export const ReviewStep = ({
  serverName,
  serverDescription,
  officialServers,
  selectedInstanceIds,
  toolSelections,
}: ReviewStepProps) => {
  const allConnectionConfigs = useConnectionConfigs(officialServers);

  const selectedConfigs = allConnectionConfigs.filter((config) =>
    selectedInstanceIds.includes(config.id),
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-lg font-semibold">作成内容の確認</h2>

        {/* サーバー情報 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">サーバー情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-gray-700">名前</p>
              <p className="text-base">{serverName}</p>
            </div>
            {serverDescription && (
              <div>
                <p className="text-sm font-medium text-gray-700">説明</p>
                <p className="text-base">{serverDescription}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 統合する接続設定 */}
      <div>
        <h3 className="mb-3 text-base font-semibold">統合する接続設定</h3>
        <div className="space-y-3">
          {selectedConfigs.map((connectionConfig) => {
            const serviceTemplate = connectionConfig.mcpServerTemplate;
            const selectedTools = toolSelections[connectionConfig.id] ?? [];
            const selectedToolsList = connectionConfig.tools.filter((t) =>
              selectedTools.includes(t.id),
            );

            return (
              <Card key={connectionConfig.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {connectionConfig.normalizedName || serviceTemplate.name}
                    </CardTitle>
                    <Badge variant="secondary">
                      {selectedTools.length} ツール
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-2 text-sm text-gray-600">
                    {serviceTemplate.description}
                  </p>
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-700">
                      有効なツール:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedToolsList.map((tool) => (
                        <Badge
                          key={tool.id}
                          variant="outline"
                          className="text-xs"
                        >
                          {tool.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

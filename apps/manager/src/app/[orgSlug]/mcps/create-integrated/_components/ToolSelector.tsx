"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { RouterOutputs } from "@/trpc/react";
import { CheckCircle2 } from "lucide-react";

type OfficialServers =
  RouterOutputs["v2"]["userMcpServer"]["findOfficialServers"];

type ConnectionConfigInstance =
  NonNullable<OfficialServers>[number]["templateInstances"][number];

type ToolSelectorProps = {
  officialServers: OfficialServers | undefined;
  selectedInstanceIds: string[];
  toolSelections: Record<string, string[]>; // instanceId -> toolIds[]
  onToggleTool: (instanceId: string, toolId: string) => void;
  onSelectAllTools: (instanceId: string) => void;
  onDeselectAllTools: (instanceId: string) => void;
};

/**
 * ツール選択コンポーネント
 *
 * 既存の設定済み接続設定から選択されたものに対して、ツールを選択します。
 * OAuth認証や環境変数入力は既に完了しているため不要です。
 */
export const ToolSelector = ({
  officialServers,
  selectedInstanceIds,
  toolSelections,
  onToggleTool,
  onSelectAllTools,
  onDeselectAllTools,
}: ToolSelectorProps) => {
  // 選択された接続設定を取得
  const allConnectionConfigs: ConnectionConfigInstance[] =
    officialServers?.flatMap((server) => server.templateInstances) ?? [];

  const selectedConfigs = allConnectionConfigs.filter((config) =>
    selectedInstanceIds.includes(config.id),
  );

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">ツールを選択</h2>

      {selectedConfigs.map((connectionConfig) => {
        const serviceTemplate = connectionConfig.mcpServerTemplate;
        const selectedTools = toolSelections[connectionConfig.id] ?? [];
        const availableTools = connectionConfig.tools;
        const allSelected = selectedTools.length === availableTools.length;

        return (
          <Card key={connectionConfig.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {connectionConfig.normalizedName || serviceTemplate.name}
                    </CardTitle>
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedTools.length} / {availableTools.length}{" "}
                      ツール選択中
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="border-0 bg-green-100 px-2 py-1 text-xs text-green-800"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    認証済み
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectAllTools(connectionConfig.id)}
                    disabled={allSelected}
                  >
                    全選択
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeselectAllTools(connectionConfig.id)}
                    disabled={selectedTools.length === 0}
                  >
                    全解除
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableTools.map((tool) => {
                const isSelected = selectedTools.includes(tool.id);

                return (
                  <div
                    key={tool.id}
                    className="flex items-start gap-3 rounded-md border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                  >
                    <Switch
                      checked={isSelected}
                      onCheckedChange={() =>
                        onToggleTool(connectionConfig.id, tool.id)
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{tool.name}</p>
                        {isSelected && (
                          <Badge variant="secondary" className="text-xs">
                            有効
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {tool.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

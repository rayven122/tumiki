"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { McpServerTemplate, McpTool } from "@tumiki/db/server";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { EnvVarForm } from "./EnvVarForm";
import { CheckCircle2, Shield, Loader2 } from "lucide-react";

type TemplateWithTools = McpServerTemplate & {
  mcpTools: McpTool[];
};

type OfficialServers =
  RouterOutputs["v2"]["userMcpServer"]["findOfficialServers"];

type ToolSelectorProps = {
  templates: TemplateWithTools[];
  selectedTemplateIds: string[];
  toolSelections: Record<string, string[]>; // templateId -> toolIds[]
  envVars: Record<string, Record<string, string>>; // templateId -> { key: value }
  officialServers: OfficialServers | undefined;
  onToggleTool: (templateId: string, toolId: string) => void;
  onSelectAllTools: (templateId: string) => void;
  onDeselectAllTools: (templateId: string) => void;
  onEnvVarChange: (templateId: string, key: string, value: string) => void;
};

/**
 * ツール選択コンポーネント
 */
export const ToolSelector = ({
  templates,
  selectedTemplateIds,
  toolSelections,
  envVars,
  officialServers,
  onToggleTool,
  onSelectAllTools,
  onDeselectAllTools,
  onEnvVarChange,
}: ToolSelectorProps) => {
  const selectedTemplates = templates.filter((t) =>
    selectedTemplateIds.includes(t.id),
  );

  // 設定済みtemplate instanceを抽出
  const configuredTemplateIds = new Set(
    officialServers?.flatMap((server) =>
      server.templateInstances.map((instance) => instance.mcpServerTemplateId),
    ) ?? [],
  );

  // OAuth認証mutation
  const { mutate: authenticateOAuth, isPending: isOAuthAuthenticating } =
    api.v2.oauth.connectMcpServerForIntegrated.useMutation({
      onSuccess: (response) => {
        toast.info("OAuth認証画面に移動します...");
        // sessionStorageは自動保存済み（Jotai atomWithStorage）
        window.location.href = response.authorizationUrl;
      },
      onError: (error) => {
        toast.error(`OAuth認証の開始に失敗しました: ${error.message}`);
      },
    });

  const handleOAuthAuthenticate = (templateId: string) => {
    authenticateOAuth({ templateId });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">ツールを選択</h2>

      {selectedTemplates.map((template) => {
        const selectedTools = toolSelections[template.id] ?? [];
        const allSelected = selectedTools.length === template.mcpTools.length;
        const isConfigured = configuredTemplateIds.has(template.id);

        return (
          <Card key={template.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {template.name}
                    </CardTitle>
                    <p className="mt-1 text-sm text-gray-500">
                      {selectedTools.length} / {template.mcpTools.length}{" "}
                      ツール選択中
                    </p>
                  </div>
                  {isConfigured && (
                    <Badge
                      variant="secondary"
                      className="px-2 py-1 text-xs text-green-800 bg-green-100 border-0"
                    >
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      認証済み
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectAllTools(template.id)}
                    disabled={allSelected}
                  >
                    全選択
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeselectAllTools(template.id)}
                    disabled={selectedTools.length === 0}
                  >
                    全解除
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {template.mcpTools.map((tool) => {
                const isSelected = selectedTools.includes(tool.id);

                return (
                  <div
                    key={tool.id}
                    className="flex items-start gap-3 rounded-md border border-gray-200 p-3 transition-colors hover:bg-gray-50"
                  >
                    <Switch
                      checked={isSelected}
                      onCheckedChange={() => onToggleTool(template.id, tool.id)}
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

              {/* OAuth認証ボタン（未設定OAuthテンプレート） */}
              {template.authType === "OAUTH" && !isConfigured && (
                <div className="mt-4 space-y-3">
                  <Button
                    onClick={() => handleOAuthAuthenticate(template.id)}
                    disabled={isOAuthAuthenticating}
                    className="w-full"
                    variant="default"
                  >
                    {isOAuthAuthenticating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        OAuth認証中...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        OAuth認証を開始
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500">
                    認証画面に移動します。認証完了後、この画面に戻ります。
                  </p>
                </div>
              )}

              {/* 環境変数入力フォーム（未設定API_KEYテンプレートのみ） */}
              {template.envVarKeys.length > 0 &&
                !isConfigured &&
                template.authType !== "OAUTH" && (
                  <EnvVarForm
                    envVarKeys={template.envVarKeys}
                    envVars={envVars[template.id] ?? {}}
                    onEnvVarChange={(key, value) =>
                      onEnvVarChange(template.id, key, value)
                    }
                  />
                )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

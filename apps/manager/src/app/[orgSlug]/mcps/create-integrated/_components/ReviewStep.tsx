"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { McpServerTemplate, McpTool } from "@tumiki/db/server";

type TemplateWithTools = McpServerTemplate & {
  mcpTools: McpTool[];
};

type ReviewStepProps = {
  serverName: string;
  serverDescription: string;
  templates: TemplateWithTools[];
  selectedTemplateIds: string[];
  toolSelections: Map<string, Set<string>>;
};

/**
 * 確認ステップコンポーネント
 */
export const ReviewStep = ({
  serverName,
  serverDescription,
  templates,
  selectedTemplateIds,
  toolSelections,
}: ReviewStepProps) => {
  const selectedTemplates = templates.filter((t) =>
    selectedTemplateIds.includes(t.id),
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

      {/* 統合するテンプレート */}
      <div>
        <h3 className="mb-3 text-base font-semibold">統合するテンプレート</h3>
        <div className="space-y-3">
          {selectedTemplates.map((template) => {
            const selectedTools = toolSelections.get(template.id) ?? new Set();
            const selectedToolsList = template.mcpTools.filter((t) =>
              selectedTools.has(t.id),
            );

            return (
              <Card key={template.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <Badge variant="secondary">
                      {selectedTools.size} ツール
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-2 text-sm text-gray-600">
                    {template.description}
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

"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Server, CheckCircle2, Wrench } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";

type OfficialServers =
  RouterOutputs["v2"]["userMcpServer"]["findOfficialServers"];

type McpServerTemplateWithTools =
  RouterOutputs["v2"]["mcpServer"]["findAll"][number];

type TemplateSelectorProps = {
  templates: McpServerTemplateWithTools[];
  officialServers: OfficialServers | undefined;
  selectedTemplateIds: string[];
  onToggleTemplate: (templateId: string) => void;
};

/**
 * テンプレート選択コンポーネント
 */
export const TemplateSelector = ({
  templates,
  officialServers,
  selectedTemplateIds,
  onToggleTemplate,
}: TemplateSelectorProps) => {
  // 設定済みtemplate instanceを抽出
  const configuredTemplateIds = new Set(
    officialServers?.flatMap((server) =>
      server.templateInstances.map((instance) => instance.mcpServerTemplateId),
    ) ?? [],
  );

  // 設定済みと未設定に分離
  const configuredTemplates = templates.filter((t) =>
    configuredTemplateIds.has(t.id),
  );
  const unconfiguredTemplates = templates.filter(
    (t) => !configuredTemplateIds.has(t.id),
  );

  const totalTemplates =
    configuredTemplates.length + unconfiguredTemplates.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">テンプレートを選択</h2>
        <Badge variant="outline">
          {selectedTemplateIds.length} / {totalTemplates} 選択中
        </Badge>
      </div>

      {selectedTemplateIds.length < 2 && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          最低2つのテンプレートを選択してください
        </div>
      )}

      {/* 設定済みtemplate instance */}
      {configuredTemplates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="text-base font-semibold text-gray-900">
              設定済みのMCPサーバー
            </h3>
            <Badge variant="secondary" className="text-xs">
              {configuredTemplates.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {configuredTemplates.map((template) => {
              const isSelected = selectedTemplateIds.includes(template.id);

              return (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-colors hover:border-blue-300 ${
                    isSelected ? "border-blue-500 bg-blue-50" : ""
                  }`}
                  onClick={() => onToggleTemplate(template.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* アイコン表示 */}
                        {template.iconPath ? (
                          <Image
                            src={template.iconPath}
                            alt={`${template.name} icon`}
                            width={40}
                            height={40}
                            className="rounded-md"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100">
                            <Server className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base">
                            {template.name}
                          </CardTitle>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="border-0 bg-green-100 px-2 py-1 text-xs text-green-800"
                        >
                          認証済み
                        </Badge>
                        <Checkbox checked={isSelected} className="mt-0.5" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* 利用可能なツール数 */}
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                      <Wrench className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        利用可能なツール
                      </span>
                      <span className="ml-auto text-sm font-semibold text-gray-900">
                        {template.mcpTools.length}
                      </span>
                    </div>

                    {/* 説明文 */}
                    <p className="text-sm text-gray-600">
                      {template.description}
                    </p>

                    {/* 認証情報とタグ */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-500">
                        認証: {template.authType}
                      </span>
                      {template.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 未設定template */}
      {unconfiguredTemplates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-gray-600" />
            <h3 className="text-base font-semibold text-gray-900">
              未設定のMCPサーバー
            </h3>
            <Badge variant="secondary" className="text-xs">
              {unconfiguredTemplates.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {unconfiguredTemplates.map((template) => {
              const isSelected = selectedTemplateIds.includes(template.id);

              return (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-colors hover:border-blue-300 ${
                    isSelected ? "border-blue-500 bg-blue-50" : ""
                  }`}
                  onClick={() => onToggleTemplate(template.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* アイコン表示 */}
                        {template.iconPath ? (
                          <Image
                            src={template.iconPath}
                            alt={`${template.name} icon`}
                            width={40}
                            height={40}
                            className="rounded-md"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100">
                            <Server className="h-6 w-6 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-base">
                            {template.name}
                          </CardTitle>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {template.authType === "OAUTH" && (
                          <Badge
                            variant="secondary"
                            className="border-0 bg-green-100 px-2 py-1 text-xs text-green-800"
                          >
                            OAuth
                          </Badge>
                        )}
                        {template.authType === "API_KEY" && (
                          <Badge
                            variant="secondary"
                            className="border-0 bg-blue-100 px-2 py-1 text-xs text-blue-800"
                          >
                            API Key
                          </Badge>
                        )}
                        {template.authType === "NONE" && (
                          <Badge
                            variant="secondary"
                            className="border-0 bg-purple-100 px-2 py-1 text-xs text-purple-800"
                          >
                            設定不要
                          </Badge>
                        )}
                        <Checkbox checked={isSelected} className="mt-0.5" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* 利用可能なツール数 */}
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                      <Wrench className="h-4 w-4 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        利用可能なツール
                      </span>
                      <span className="ml-auto text-sm font-semibold text-gray-900">
                        {template.mcpTools.length}
                      </span>
                    </div>

                    {/* 説明文 */}
                    <p className="text-sm text-gray-600">
                      {template.description}
                    </p>

                    {/* 認証情報とタグ */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-500">
                        認証: {template.authType}
                      </span>
                      {template.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

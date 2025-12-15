"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Server, CheckCircle2, Wrench } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";

type OfficialServers =
  RouterOutputs["v2"]["userMcpServer"]["findOfficialServers"];

type ConnectionConfigInstance =
  NonNullable<OfficialServers>[number]["templateInstances"][number];

type TemplateSelectorProps = {
  officialServers: OfficialServers | undefined;
  selectedInstanceIds: string[];
  onToggleInstance: (instanceId: string) => void;
};

/**
 * 接続設定選択コンポーネント
 *
 * 用語マッピング:
 * - connectionConfig (McpServerTemplateInstance): 接続設定 - ユーザーが認証情報を設定したインスタンス
 * - integratedServer (McpServer): 統合サーバー - 複数の接続設定を束ねて公開するサーバー
 *
 * このコンポーネントでは既存の設定済み接続設定のみを表示します
 */
export const TemplateSelector = ({
  officialServers,
  selectedInstanceIds,
  onToggleInstance,
}: TemplateSelectorProps) => {
  // 全ての設定済み接続設定を抽出
  const allConnectionConfigs: ConnectionConfigInstance[] =
    officialServers?.flatMap((server) => server.templateInstances) ?? [];

  const totalConfigs = allConnectionConfigs.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">接続設定を選択</h2>
        <Badge variant="outline">
          {selectedInstanceIds.length} / {totalConfigs} 選択中
        </Badge>
      </div>

      {selectedInstanceIds.length < 2 && (
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
          最低2つの接続設定を選択してください
        </div>
      )}

      {allConnectionConfigs.length === 0 ? (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-600">
            設定済みの接続設定がありません。
          </p>
          <p className="mt-2 text-sm text-gray-500">
            先にサービスを接続してから、統合サーバーを作成してください。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <h3 className="text-base font-semibold text-gray-900">
              設定済みの接続設定
            </h3>
            <Badge variant="secondary" className="text-xs">
              {allConnectionConfigs.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {allConnectionConfigs.map((connectionConfig) => {
              const isSelected = selectedInstanceIds.includes(
                connectionConfig.id,
              );
              const serviceTemplate = connectionConfig.mcpServerTemplate;

              return (
                <Card
                  key={connectionConfig.id}
                  className={`cursor-pointer transition-colors hover:border-blue-300 ${
                    isSelected ? "border-blue-500 bg-blue-50" : ""
                  }`}
                  onClick={() => onToggleInstance(connectionConfig.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {/* サービスアイコン */}
                        {serviceTemplate.iconPath ? (
                          <Image
                            src={serviceTemplate.iconPath}
                            alt={`${serviceTemplate.name} icon`}
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
                            {connectionConfig.normalizedName ||
                              serviceTemplate.name}
                          </CardTitle>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {serviceTemplate.name}
                          </p>
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
                        {
                          connectionConfig.tools.filter(
                            (tool) => tool.isEnabled,
                          ).length
                        }
                      </span>
                    </div>

                    {/* 説明文 */}
                    <p className="text-sm text-gray-600">
                      {serviceTemplate.description}
                    </p>

                    {/* 認証情報とタグ */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-500">
                        認証: {serviceTemplate.authType}
                      </span>
                      {serviceTemplate.tags.map((tag) => (
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

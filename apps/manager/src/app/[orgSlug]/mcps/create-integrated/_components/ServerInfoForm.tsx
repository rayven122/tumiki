"use client";

import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Server } from "lucide-react";
import type { RouterOutputs } from "@/trpc/react";

type McpServerTemplateWithTools =
  RouterOutputs["v2"]["mcpServer"]["findAll"][number];

type ServerInfoFormProps = {
  serverName: string;
  serverDescription: string;
  templates: McpServerTemplateWithTools[];
  selectedTemplateIds: string[];
  toolSelections: Record<string, string[]>; // templateId -> toolIds[]
  onServerNameChange: (value: string) => void;
  onServerDescriptionChange: (value: string) => void;
};

/**
 * サーバー情報入力フォームコンポーネント
 */
export const ServerInfoForm = ({
  serverName,
  serverDescription,
  templates,
  selectedTemplateIds,
  toolSelections,
  onServerNameChange,
  onServerDescriptionChange,
}: ServerInfoFormProps) => {
  const selectedTemplates = templates.filter((t) =>
    selectedTemplateIds.includes(t.id),
  );

  return (
    <div className="space-y-6">
      {/* 選択されたテンプレート一覧 */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">選択されたテンプレート</h2>
        <div className="space-y-3">
          {selectedTemplates.map((template) => {
            const selectedTools = toolSelections[template.id] ?? [];
            const toolCount = selectedTools.length;

            return (
              <div
                key={template.id}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3"
              >
                {/* テンプレートアイコン */}
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

                {/* テンプレート情報 */}
                <div className="flex-1">
                  <p className="text-sm font-medium">{template.name}</p>
                  <p className="text-xs text-gray-500">
                    {toolCount} ツール選択中
                  </p>
                </div>

                {/* ツール数バッジ */}
                <Badge variant="secondary" className="text-xs">
                  {toolCount} / {template.mcpTools.length}
                </Badge>
              </div>
            );
          })}
        </div>
      </div>

      {/* サーバー情報入力フォーム */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">サーバー情報を入力</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="server-name">
              サーバー名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="server-name"
              type="text"
              value={serverName}
              onChange={(e) => onServerNameChange(e.target.value)}
              placeholder="例: GitHub + Slack 統合"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="server-description">説明（任意）</Label>
            <Textarea
              id="server-description"
              value={serverDescription}
              onChange={(e) => onServerDescriptionChange(e.target.value)}
              placeholder="このサーバーの用途を入力してください"
              className="mt-1"
              rows={3}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

"use client";

import { Button } from "@/components/ui/button";
import type React from "react";
import Image from "next/image";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { UserMcpServerConfigModal } from "../modals/UserMcpServerConfigModal";
import { Server, Wrench } from "lucide-react";
import { ToolsModal } from "../modals/ToolsModal";
import type { Prisma } from "@tumiki/db/prisma";

type McpServerTemplateWithTools = Prisma.McpServerTemplateGetPayload<{
  include: { mcpTools: true };
}> & {
  tools: Prisma.McpToolGetPayload<object>[];
};

type ServerCardProps = {
  mcpServer: McpServerTemplateWithTools;
};

export function ServerCard({ mcpServer }: ServerCardProps) {
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [toolsModalOpen, setToolsModalOpen] = useState(false);

  // DBから取得した認証タイプを使用
  // authType + envVars の組み合わせで判定
  const getAuthTypeDisplay = (
    authType: string | null,
    envVars: string[] | null,
  ) => {
    switch (authType) {
      case "OAUTH":
        return {
          type: "OAuth",
          color: "text-green-800",
          bgColor: "bg-green-100",
        };
      case "API_KEY":
        return {
          type: "API Key",
          color: "text-blue-800",
          bgColor: "bg-blue-100",
        };
      case "CLOUD_RUN_IAM":
        // Cloud Run IAM + カスタムヘッダーがある場合は API Key として扱う
        if (envVars && envVars.length > 0) {
          return {
            type: "API Key",
            color: "text-blue-800",
            bgColor: "bg-blue-100",
          };
        }
        // Cloud Run IAM単体の場合は設定不要
        return {
          type: "設定不要",
          color: "text-purple-800",
          bgColor: "bg-purple-100",
        };
      case "NONE":
      default:
        return {
          type: "設定不要",
          color: "text-purple-800",
          bgColor: "bg-purple-100",
        };
    }
  };

  const authInfo = getAuthTypeDisplay(mcpServer.authType, mcpServer.envVarKeys);

  // DBから説明とタグを取得
  const description = mcpServer.description ?? "";
  const tags = mcpServer.tags ?? [];

  return (
    <Card className="relative flex h-full flex-col">
      {/* 認証タイプタグ（右上） */}
      <div className="absolute top-2 right-2 z-10">
        <Badge
          variant="secondary"
          className={`px-2 py-1 text-xs ${authInfo.color} ${authInfo.bgColor} border-0`}
        >
          {authInfo.type}
        </Badge>
      </div>

      <CardHeader className="flex flex-row items-center space-y-0 pr-16 pb-2">
        {mcpServer.iconPath ? (
          <div className="mr-2 rounded-md p-2">
            <Image
              src={mcpServer.iconPath}
              alt={mcpServer.name}
              width={32}
              height={32}
            />
          </div>
        ) : (
          <div className="mr-2 rounded-md p-2">
            <div className="rounded-md bg-gradient-to-br from-blue-500 to-purple-600 p-2">
              <div className="flex h-8 w-8 items-center justify-center">
                <Server className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        )}
        <div className="flex-1">
          <CardTitle>{mcpServer.name}</CardTitle>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-blue-200 bg-blue-50 text-blue-700"
            >
              ツール: {mcpServer.tools.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {/* ツール一覧を表示するボタン */}
        <Button
          variant="outline"
          size="sm"
          className="flex w-full items-center justify-between"
          onClick={() => setToolsModalOpen(true)}
        >
          <span className="flex items-center">
            <Wrench className="mr-2 size-4" />
            利用可能なツール
          </span>
          <Badge variant="secondary" className="ml-2">
            {mcpServer.tools.length}
          </Badge>
        </Button>

        {/* MCPサーバーの概要 */}
        <div>
          <p className="text-sm leading-relaxed text-gray-600">{description}</p>
        </div>

        {/* カテゴリータグ（カード下部） */}
        <div className="flex flex-wrap gap-1 pt-2">
          {tags.map((tag: string, index: number) => (
            <span
              key={index}
              className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: "#6B46C1" }}
            >
              {tag}
            </span>
          ))}
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button
          type="button"
          onClick={() => {
            setTokenModalOpen(true);
          }}
          className="w-full"
        >
          接続
        </Button>
      </CardFooter>

      {/* MCPサーバー追加モーダル */}
      {tokenModalOpen && (
        <UserMcpServerConfigModal
          onOpenChange={setTokenModalOpen}
          mcpServer={mcpServer}
        />
      )}

      {/* ツール一覧モーダル */}
      <ToolsModal
        open={toolsModalOpen}
        onOpenChange={setToolsModalOpen}
        serverName={mcpServer.name}
        tools={mcpServer.tools}
      />
    </Card>
  );
}

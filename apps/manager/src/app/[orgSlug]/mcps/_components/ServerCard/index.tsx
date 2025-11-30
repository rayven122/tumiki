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
import { CreateServerModal } from "./CreateServerModal";
import { Server, Wrench } from "lucide-react";
import { ToolsModal } from "./ToolsModal";
import type { Prisma } from "@tumiki/db/prisma";
import { AuthTypeBadge } from "./_components/AuthTypeBadge";

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

  return (
    <Card className="relative flex h-full flex-col">
      {/* 認証タイプタグ（右上） */}
      <div className="absolute top-3 right-3 z-10">
        <AuthTypeBadge authType={mcpServer.authType} />
      </div>

      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
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
          <p className="text-sm leading-relaxed text-gray-600">
            {mcpServer.description}
          </p>
        </div>

        {/* カテゴリータグ（カード下部） */}
        <div className="flex flex-wrap gap-1 pt-2">
          {mcpServer.tags.map((tag: string, index: number) => (
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
        <CreateServerModal
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

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
import { ApiTokenModal } from "./ApiTokenModal";
import { PenToolIcon as ToolIcon } from "lucide-react";
import { ToolsModal } from "./ToolsModal";
import type { Prisma } from "@prisma/client";

type McpServerWithTools = Prisma.McpServerGetPayload<{
  include: { tools: true };
}>;

type ServerCardProps = {
  mcpServer: McpServerWithTools;
};

export function ServerCard({ mcpServer }: ServerCardProps) {
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [toolsModalOpen, setToolsModalOpen] = useState(false);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <div className="mr-2 rounded-md p-2">
          {mcpServer.iconPath && (
            <Image
              src={mcpServer.iconPath}
              alt={mcpServer.name}
              width={32}
              height={32}
            />
          )}
        </div>
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
      <CardContent className="flex-1">
        {/* ツール一覧を表示するボタン */}
        <Button
          variant="outline"
          size="sm"
          className="mb-2 flex w-full items-center justify-between"
          onClick={() => setToolsModalOpen(true)}
        >
          <span className="flex items-center">
            <ToolIcon className="mr-2 h-4 w-4" />
            利用可能なツール
          </span>
          <Badge variant="secondary" className="ml-2">
            {mcpServer.tools.length}
          </Badge>
        </Button>
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

      {/* APIトークンモーダル */}
      {tokenModalOpen && (
        <ApiTokenModal onOpenChange={setTokenModalOpen} mcpServer={mcpServer} />
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

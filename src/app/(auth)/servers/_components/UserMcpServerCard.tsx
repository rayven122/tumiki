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
import { PenToolIcon as ToolIcon } from "lucide-react";
import { ToolsModal } from "./ToolsModal";
import type { Prisma } from "@prisma/client";

type UserMcpServerWithTools = Prisma.UserMcpServerGetPayload<{
  select: {
    id: true;
    name: true;
    tools: true;
    mcpServer: true;
  };
}>;

type UserMcpServerCardProps = {
  userMcpServer: UserMcpServerWithTools;
};

export const UserMcpServerCard = ({
  userMcpServer,
}: UserMcpServerCardProps) => {
  const [toolsModalOpen, setToolsModalOpen] = useState(false);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <div className="mr-2 rounded-md p-2">
          {userMcpServer.mcpServer.iconPath && (
            <Image
              src={userMcpServer.mcpServer.iconPath}
              alt={userMcpServer.name ?? userMcpServer.mcpServer.name}
              width={32}
              height={32}
            />
          )}
        </div>
        <div className="flex-1">
          <CardTitle>
            {userMcpServer.name ?? userMcpServer.mcpServer.name}
          </CardTitle>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-blue-200 bg-blue-50 text-blue-700"
            >
              ツール: {userMcpServer.tools.length}
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
            {userMcpServer.tools.length}
          </Badge>
        </Button>
      </CardContent>
      <CardFooter className="mt-auto">
        {/* <Button
          type="button"
          onClick={() => {
            setTokenModalOpen(true);
          }}
          className="w-full"
        >
          接続
        </Button> */}
      </CardFooter>

      {/* ツール一覧モーダル */}
      <ToolsModal
        open={toolsModalOpen}
        onOpenChange={setToolsModalOpen}
        serverName={userMcpServer.name ?? userMcpServer.mcpServer.name}
        tools={userMcpServer.tools}
      />
    </Card>
  );
};

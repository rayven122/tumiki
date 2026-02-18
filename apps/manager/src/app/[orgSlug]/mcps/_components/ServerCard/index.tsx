"use client";

import { Button } from "@/components/ui/button";
import type React from "react";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LinkifiedText } from "@/components/ui/LinkifiedText";
import { useState } from "react";
import { CreateServerModal } from "./CreateServerModal";
import { Wrench, Building2, Trash2, MoreHorizontal } from "lucide-react";
import { ToolsModal } from "./ToolsModal";
import type { Prisma } from "@tumiki/db/prisma";
import { AuthTypeBadge } from "./ServerCardAuthTypeBadge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertTriangleIcon } from "lucide-react";
import { api } from "@/trpc/react";
import { toast } from "@/lib/client/toast";
import { EntityIcon } from "@/components/ui/EntityIcon";

type McpServerTemplateWithTools = Prisma.McpServerTemplateGetPayload<{
  include: { mcpTools: true };
}> & {
  tools: Prisma.McpToolGetPayload<object>[];
  isOrgTemplate?: boolean;
};

type ServerCardProps = {
  mcpServer: McpServerTemplateWithTools;
};

export function ServerCard({ mcpServer }: ServerCardProps) {
  const [tokenModalOpen, setTokenModalOpen] = useState(false);
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const utils = api.useUtils();
  const deleteTemplateMutation = api.mcpServer.deleteTemplate.useMutation({
    onSuccess: async () => {
      toast.success(`${mcpServer.name}のテンプレートを削除しました。`);
      await utils.mcpServer.findAll.invalidate();
      setDeleteModalOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "テンプレートの削除に失敗しました");
    },
  });

  const handleDeleteTemplate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteTemplateMutation.mutate({ templateId: mcpServer.id });
  };

  return (
    <Card
      className={`relative flex h-full w-full flex-col ${
        mcpServer.isOrgTemplate ? "border-2 border-emerald-200" : ""
      }`}
    >
      {/* バッジエリア（右上） */}
      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
        {/* 認証タイプバッジ + 三点メニュー */}
        <div className="flex items-center gap-1">
          <AuthTypeBadge authType={mcpServer.authType} />
          {mcpServer.isOrgTemplate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-gray-100"
                >
                  <span className="sr-only">メニューを開く</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setDeleteModalOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {/* プライベートテンプレートバッジ */}
        {mcpServer.isOrgTemplate && (
          <Badge
            variant="secondary"
            className="bg-emerald-100 text-emerald-700"
          >
            <Building2 className="mr-1 h-3 w-3" />
            プライベート
          </Badge>
        )}
      </div>

      <CardHeader className="flex flex-row items-center space-y-0 pb-2">
        <EntityIcon
          iconPath={mcpServer.iconPath}
          fallbackUrl={mcpServer.url}
          type="mcp"
          size="sm"
          alt={mcpServer.name}
          className="mr-2"
        />
        <div className="min-w-0 flex-1 pr-24">
          <CardTitle className="truncate">{mcpServer.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-3">
        {/* ツール一覧を表示するボタン */}
        <Button
          variant="outline"
          size="sm"
          className="flex w-full items-center justify-between"
          onClick={() => setToolsModalOpen(true)}
          disabled={mcpServer.tools.length === 0}
        >
          <span className="flex items-center">
            <Wrench className="mr-2 size-4" />
            利用可能なツール
          </span>
          <Badge variant="secondary" className="ml-2">
            {mcpServer.tools.length > 0
              ? mcpServer.tools.length
              : "認証後に表示"}
          </Badge>
        </Button>

        {/* MCPサーバーの概要 */}
        <div>
          <p className="text-sm leading-relaxed whitespace-pre-line text-gray-600">
            <LinkifiedText text={mcpServer.description ?? ""} />
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
          追加
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

      {/* テンプレート削除確認モーダル */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangleIcon className="mr-2 h-5 w-5 text-red-500" />
              テンプレートを削除
            </DialogTitle>
            <DialogDescription>
              {`"${mcpServer.name}" を削除してもよろしいですか？この操作は元に戻せません。`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleteTemplateMutation.isPending}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTemplate}
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending ? "削除中..." : "削除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

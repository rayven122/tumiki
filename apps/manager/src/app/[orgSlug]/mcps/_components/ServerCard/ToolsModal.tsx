"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";
import type { McpTool } from "@tumiki/db/prisma";

type ToolsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverName: string;
  tools: Pick<McpTool, "id" | "name" | "description">[];
};

export function ToolsModal({
  open,
  onOpenChange,
  serverName,
  tools,
}: ToolsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // ツールの検索とフィルタリング
  const filteredTools = tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>{serverName}の利用可能なツール</DialogTitle>
          <DialogDescription>
            このサーバーで利用できるツール一覧です。全{tools.length}
            件のツールがあります。
          </DialogDescription>
        </DialogHeader>

        {/* 検索ボックス */}
        <div className="relative mb-4">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder="ツールを検索..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* ツール一覧 */}
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {filteredTools.length > 0 ? (
            <div className="grid gap-3">
              {filteredTools.map((tool) => (
                <div
                  key={tool.id}
                  className="hover:bg-muted/50 rounded-md border p-3 transition-colors"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="font-medium">{tool.name}</div>
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {tool.description}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-8 text-center">
              該当するツールがありません
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

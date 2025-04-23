"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type Tool = {
  id: string;
  name: string;
  description: string;
};

type ToolSelectorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTools: string[];
  onToolsChange: (toolIds: string[]) => void;
};

export function ToolSelectorDialog({
  open,
  onOpenChange,
  selectedTools,
  onToolsChange,
}: ToolSelectorDialogProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [localSelectedTools, setLocalSelectedTools] =
    useState<string[]>(selectedTools);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        // 実際の実装ではAPIからツールを取得します
        const response = await fetch("/api/mcp/tools");
        if (!response.ok) {
          throw new Error("ツールの取得に失敗しました");
        }
        // const data = await response.json()
        // setTools(data)
      } catch (error) {
        console.error("ツールの取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      //   fetchTools()
      setLocalSelectedTools(selectedTools);
    }
  }, [open, selectedTools]);

  const filteredTools = tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleToolToggle = (toolId: string) => {
    setLocalSelectedTools((prev) => {
      if (prev.includes(toolId)) {
        return prev.filter((id) => id !== toolId);
      } else {
        return [...prev, toolId];
      }
    });
  };

  const handleSave = () => {
    onToolsChange(localSelectedTools);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ツールの選択</DialogTitle>
          <DialogDescription>
            API Keyで使用できるツールを選択してください
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="relative mb-4">
            <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
            <Input
              placeholder="ツールを検索..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="mb-2">
            <div className="flex items-center justify-between">
              <Label>選択中のツール</Label>
              <Badge variant="outline">{localSelectedTools.length}</Badge>
            </div>
            <div className="mt-2 mb-4 flex flex-wrap gap-1">
              {localSelectedTools.length === 0 ? (
                <span className="text-muted-foreground text-sm">
                  ツールが選択されていません
                </span>
              ) : (
                tools
                  .filter((tool) => localSelectedTools.includes(tool.id))
                  .map((tool) => (
                    <Badge
                      key={tool.id}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {tool.name}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-1 h-4 w-4 p-0"
                        onClick={() => handleToolToggle(tool.id)}
                      >
                        <span className="sr-only">{tool.name}を削除</span>×
                      </Button>
                    </Badge>
                  ))
              )}
            </div>
          </div>

          <Label>利用可能なツール</Label>
          {loading ? (
            <div className="py-4 text-center">ツールを読み込み中...</div>
          ) : (
            <ScrollArea className="mt-2 h-60 rounded-md border">
              <div className="p-4">
                {filteredTools.length === 0 ? (
                  <div className="text-muted-foreground py-4 text-center">
                    検索条件に一致するツールがありません
                  </div>
                ) : (
                  filteredTools.map((tool) => (
                    <div
                      key={tool.id}
                      className="flex items-start space-x-2 border-b py-2 last:border-0"
                    >
                      <Checkbox
                        id={`tool-${tool.id}`}
                        checked={localSelectedTools.includes(tool.id)}
                        onCheckedChange={() => handleToolToggle(tool.id)}
                        className="mt-1"
                      />
                      <div className="grid gap-1">
                        <Label
                          htmlFor={`tool-${tool.id}`}
                          className="cursor-pointer font-medium"
                        >
                          {tool.name}
                        </Label>
                        <p className="text-muted-foreground text-sm">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

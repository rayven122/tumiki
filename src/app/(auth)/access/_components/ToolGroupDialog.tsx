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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

type Tool = {
  id: string;
  name: string;
  description: string;
};

type ToolGroup = {
  id: string;
  name: string;
  description: string;
  tools: {
    id: string;
    name: string;
  }[];
};

type ToolGroupDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: ToolGroup;
  onSave: (group: Omit<ToolGroup, "id">) => void;
};

export function ToolGroupDialog({
  open,
  onOpenChange,
  group,
  onSave,
}: ToolGroupDialogProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const fetchTools = async () => {
      try {
        // 実際の実装ではAPIからツールを取得します
        const response = await fetch("/api/mcp/tools");
        if (!response.ok) {
          throw new Error("ツールの取得に失敗しました");
        }
        // const data = await response.json();
        // setTools(data);
      } catch (error) {
        console.error("ツールの取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      //   fetchTools();
      if (group) {
        setName(group.name);
        setDescription(group.description);
        setSelectedTools(group.tools.map((tool) => tool.id));
      } else {
        setName("");
        setDescription("");
        setSelectedTools([]);
      }
    }
  }, [open, group]);

  const filteredTools = tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleToolToggle = (toolId: string) => {
    setSelectedTools((prev) => {
      if (prev.includes(toolId)) {
        return prev.filter((id) => id !== toolId);
      } else {
        return [...prev, toolId];
      }
    });
  };

  const handleSave = () => {
    if (!name.trim())
      if (selectedTools.length === 0) {
        //   toast({
        //     title: "エラー",
        //     description: "グループ名を入力してください",
        //     variant: "destructive",
        //   });
        //   return;
        // }

        //   toast({
        //     title: "エラー",
        //     description: "少なくとも1つのツールを選択してください",
        //     variant: "destructive",
        //   });
        return;
      }

    const toolsInfo = selectedTools.map((id) => {
      const tool = tools.find((t) => t.id === id);
      return {
        id,
        name: tool?.name ?? `ツール ${id}`,
      };
    });

    onSave({
      name,
      description,
      tools: toolsInfo,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {group ? "ツールグループを編集" : "新規ツールグループ"}
          </DialogTitle>
          <DialogDescription>
            {group
              ? "ツールグループの情報を編集します"
              : "新しいツールグループを作成します"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="group-name">グループ名</Label>
            <Input
              id="group-name"
              placeholder="開発用ツールセット"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="group-description">説明</Label>
            <Textarea
              id="group-description"
              placeholder="開発環境で使用するツールのセットです"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>ツール</Label>
              <div className="flex items-center">
                <Badge variant="outline" className="mr-2">
                  {selectedTools.length}個選択中
                </Badge>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
              <Input
                placeholder="ツールを検索..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <ScrollArea className="h-60 rounded-md border">
              <div className="p-4">
                {loading ? (
                  <div className="py-4 text-center">ツールを読み込み中...</div>
                ) : filteredTools.length === 0 ? (
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
                        checked={selectedTools.includes(tool.id)}
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
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>{group ? "更新" : "作成"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

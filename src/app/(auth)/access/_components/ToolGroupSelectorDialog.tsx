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

type ToolGroup = {
  id: string;
  name: string;
  description: string;
  tools: {
    id: string;
    name: string;
  }[];
};

type ToolGroupSelectorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedGroups: string[];
  onGroupsChange: (groupIds: string[]) => void;
};

export function ToolGroupSelectorDialog({
  open,
  onOpenChange,
  selectedGroups,
  onGroupsChange,
}: ToolGroupSelectorDialogProps) {
  const [groups, setGroups] = useState<ToolGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [localSelectedGroups, setLocalSelectedGroups] =
    useState<string[]>(selectedGroups);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        // 実際の実装ではAPIからツールグループを取得します
        const response = await fetch("/api/mcp/tool-groups");
        if (!response.ok) {
          throw new Error("ツールグループの取得に失敗しました");
        }
        // const data = await response.json()
        // setGroups(data)
      } catch (error) {
        console.error("ツールグループの取得エラー:", error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      //   fetchGroups()
      setLocalSelectedGroups(selectedGroups);
    }
  }, [open, selectedGroups]);

  const filteredGroups = groups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      group.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleGroupToggle = (groupId: string) => {
    setLocalSelectedGroups((prev) => {
      if (prev.includes(groupId)) {
        return prev.filter((id) => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const handleSave = () => {
    onGroupsChange(localSelectedGroups);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ツールグループの選択</DialogTitle>
          <DialogDescription>
            API Keyに割り当てるツールグループを選択してください
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="relative mb-4">
            <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
            <Input
              placeholder="ツールグループを検索..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="mb-2">
            <div className="flex items-center justify-between">
              <Label>選択中のグループ</Label>
              <Badge variant="outline">{localSelectedGroups.length}</Badge>
            </div>
            <div className="mt-2 mb-4 flex flex-wrap gap-1">
              {localSelectedGroups.length === 0 ? (
                <span className="text-muted-foreground text-sm">
                  グループが選択されていません
                </span>
              ) : (
                groups
                  .filter((group) => localSelectedGroups.includes(group.id))
                  .map((group) => (
                    <Badge
                      key={group.id}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {group.name}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="ml-1 h-4 w-4 p-0"
                        onClick={() => handleGroupToggle(group.id)}
                      >
                        <span className="sr-only">{group.name}を削除</span>×
                      </Button>
                    </Badge>
                  ))
              )}
            </div>
          </div>

          <Label>利用可能なツールグループ</Label>
          {loading ? (
            <div className="py-4 text-center">
              ツールグループを読み込み中...
            </div>
          ) : (
            <ScrollArea className="mt-2 h-60 rounded-md border">
              <div className="p-4">
                {filteredGroups.length === 0 ? (
                  <div className="text-muted-foreground py-4 text-center">
                    検索条件に一致するグループがありません
                  </div>
                ) : (
                  filteredGroups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-start space-x-2 border-b py-2 last:border-0"
                    >
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={localSelectedGroups.includes(group.id)}
                        onCheckedChange={() => handleGroupToggle(group.id)}
                        className="mt-1"
                      />
                      <div className="grid gap-1">
                        <Label
                          htmlFor={`group-${group.id}`}
                          className="cursor-pointer font-medium"
                        >
                          {group.name}
                        </Label>
                        <p className="text-muted-foreground text-sm">
                          {group.description}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {group.tools.slice(0, 5).map((tool) => (
                            <Badge
                              key={tool.id}
                              variant="outline"
                              className="border-green-200 bg-green-50 text-xs text-green-700"
                            >
                              {tool.name}
                            </Badge>
                          ))}
                          {group.tools.length > 5 && (
                            <Badge
                              variant="outline"
                              className="bg-slate-100 text-xs"
                            >
                              +{group.tools.length - 5}
                            </Badge>
                          )}
                        </div>
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

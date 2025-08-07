"use client";

import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  X,
  Upload,
  Globe,
  Users,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

import { McpServerVisibility, TransportType } from "@tumiki/db/prisma";
import { toast } from "@/utils/client/toast";

type CreateMcpServerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type Header = {
  key: string;
  value: string;
};

export const CreateMcpServerDialog = ({
  open,
  onOpenChange,
}: CreateMcpServerDialogProps) => {
  const [name, setName] = useState("new-server");
  const [iconPath, setIconPath] = useState("");
  const [url, setUrl] = useState("");
  const [headers, setHeaders] = useState<Header[]>([]);
  const [newHeader, setNewHeader] = useState({ key: "", value: "" });
  const [visibleHeaders, setVisibleHeaders] = useState<Set<number>>(new Set());
  const [visibility, setVisibility] = useState<McpServerVisibility>("PRIVATE");
  const [selectedOrganizationId, setSelectedOrganizationId] =
    useState<string>();
  const [transportType, setTransportType] = useState<TransportType>(
    TransportType.SSE,
  );

  const utils = api.useUtils();
  const { data: organizations = [] } =
    api.organization.getUserOrganizations.useQuery();

  // 組織が0個の場合、ORGANIZATIONが選択されていたらPRIVATEに変更
  useEffect(() => {
    if (organizations.length === 0 && visibility === "ORGANIZATION") {
      setVisibility("PRIVATE");
      setSelectedOrganizationId(undefined);
    }
  }, [organizations.length, visibility]);

  const createMcpServer = api.mcpServer.create.useMutation({
    onSuccess: async () => {
      toast.success("MCPサーバーを作成しました");
      await utils.mcpServer.findAll.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`エラーが発生しました: ${error.message}`);
    },
  });

  const resetForm = () => {
    setName("new-server");
    setIconPath("");
    setUrl("");
    setHeaders([]);
    setNewHeader({ key: "", value: "" });
    setVisibleHeaders(new Set());
    setVisibility("PRIVATE");
    setSelectedOrganizationId("");
    setTransportType(TransportType.SSE);
  };

  const addHeader = () => {
    if (newHeader.key.trim()) {
      setHeaders((prev) => [
        ...prev,
        { key: newHeader.key.trim(), value: newHeader.value.trim() },
      ]);
      setNewHeader({ key: "", value: "" });
    }
  };

  const removeHeader = (index: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== index));
    // 削除後のインデックス調整のため、visibleHeadersも更新
    setVisibleHeaders((prev) => {
      const newSet = new Set<number>();
      prev.forEach((visibleIndex) => {
        if (visibleIndex < index) {
          newSet.add(visibleIndex);
        } else if (visibleIndex > index) {
          newSet.add(visibleIndex - 1);
        }
      });
      return newSet;
    });
  };

  const toggleHeaderVisibility = (index: number) => {
    setVisibleHeaders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && newHeader.key.trim()) {
      e.preventDefault();
      addHeader();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const envVars = headers.reduce(
      (acc, header) => {
        acc[header.key] = header.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    createMcpServer.mutate({
      name,
      iconPath: iconPath || undefined,
      transportType,
      url,
      args: [],
      envVars,
      visibility,
      organizationId:
        visibility === McpServerVisibility.ORGANIZATION
          ? selectedOrganizationId
          : undefined,
    });
  };

  const isFormValid = () => {
    if (!name.trim()) return false;
    if (!url.trim()) return false;
    if (
      visibility === McpServerVisibility.ORGANIZATION &&
      (!selectedOrganizationId || organizations.length === 0)
    )
      return false;
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>MCPサーバーを追加</DialogTitle>
          <DialogDescription>
            外部サービスと連携するためのMCPサーバーを設定してください
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* サーバー名 */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              サーバー名 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="例: GitHub MCP"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="text-base"
            />
          </div>

          {/* アイコン */}
          <div className="space-y-2">
            <Label htmlFor="iconPath" className="text-sm font-medium">
              アイコンパス
            </Label>
            <div className="flex gap-2">
              <Input
                id="iconPath"
                placeholder="例: /icons/github.svg"
                value={iconPath}
                onChange={(e) => setIconPath(e.target.value)}
                className="text-base"
              />
              <Button type="button" variant="outline">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 接続タイプ */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">接続タイプ</Label>
            <Select
              value={transportType}
              onValueChange={(value: TransportType) => setTransportType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SSE">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">SSE</Badge>
                    <span>Server-Sent Events</span>
                  </div>
                </SelectItem>
                <SelectItem value="STREAMABLE_HTTPS">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">HTTPS</Badge>
                    <span>Streamable HTTPS</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 接続URL */}
          <div className="space-y-2">
            <Label htmlFor="url" className="text-sm font-medium">
              接続URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="url"
              placeholder={`https://api.example.com/${
                transportType === TransportType.SSE ? "sse" : "mcp"
              }`}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="font-mono text-base"
            />
            <p className="text-xs text-gray-500">
              {transportType === TransportType.SSE
                ? "SSE（Server-Sent Events）プロトコルでMCPサーバーに接続します"
                : "Streamable HTTPS プロトコルでMCPサーバーに接続します"}
            </p>
          </div>

          {/* HTTPヘッダー */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">HTTPヘッダー</Label>
              {headers.length > 0 && (
                <Badge variant="secondary">{headers.length}個</Badge>
              )}
            </div>

            {/* ヘッダー追加フォーム */}
            <div className="space-y-4 rounded-lg bg-gray-50 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">ヘッダー名</Label>
                  <Input
                    placeholder="例: Authorization"
                    value={newHeader.key}
                    onChange={(e) =>
                      setNewHeader((prev) => ({ ...prev, key: e.target.value }))
                    }
                    onKeyPress={handleKeyPress}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">値</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="例: Bearer token123..."
                      value={newHeader.value}
                      onChange={(e) =>
                        setNewHeader((prev) => ({
                          ...prev,
                          value: e.target.value,
                        }))
                      }
                      onKeyPress={handleKeyPress}
                      className="h-10"
                      type="password"
                    />
                    <Button
                      type="button"
                      onClick={addHeader}
                      disabled={!newHeader.key.trim()}
                      className="h-10 px-4"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Enterキーを押すか、追加ボタンをクリックしてHTTPヘッダーを追加できます
              </p>
            </div>

            {/* 設定済みヘッダー一覧 */}
            {headers.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">
                  設定済みHTTPヘッダー
                </Label>
                <div className="space-y-2">
                  {headers.map((header, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-colors hover:bg-gray-50"
                    >
                      <Badge variant="outline" className="font-mono text-xs">
                        {header.key}
                      </Badge>
                      <span className="text-sm text-gray-400">:</span>
                      <span className="flex-1 truncate rounded bg-gray-100 px-2 py-1 font-mono text-sm">
                        {visibleHeaders.has(index) ? header.value : "••••••••"}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleHeaderVisibility(index)}
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                      >
                        {visibleHeaders.has(index) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHeader(index)}
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 公開設定 */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">公開設定</Label>
            <Select
              value={visibility}
              onValueChange={(value: McpServerVisibility) => {
                setVisibility(value);
                if (value !== "ORGANIZATION") {
                  setSelectedOrganizationId("");
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span>プライベート</span>
                  </div>
                </SelectItem>
                {organizations.length > 0 && (
                  <SelectItem value="ORGANIZATION">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>組織内共有</span>
                    </div>
                  </SelectItem>
                )}
                <SelectItem value="PUBLIC">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <span>パブリック</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* 公開設定の説明 */}
            <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
              {visibility === "PRIVATE" && (
                <div className="flex items-start gap-2">
                  <Lock className="mt-0.5 h-4 w-4 text-gray-500" />
                  <span>作成者のみ閲覧可能です</span>
                </div>
              )}
              {visibility === "ORGANIZATION" && organizations.length > 0 && (
                <div className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4 text-gray-500" />
                  <span>組織内のメンバーと共有されます</span>
                </div>
              )}
              {visibility === "PUBLIC" && (
                <div className="flex items-start gap-2">
                  <Globe className="mt-0.5 h-4 w-4 text-gray-500" />
                  <div>
                    <p>
                      全ユーザーがMCPサーバーの追加画面から選択可能になります
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      ※ヘッダーのキー名のみ公開され、値は非公開です（ユーザ毎に、ヘッダーの値を入力する形で公開されます）
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 組織選択 */}
            {visibility === "ORGANIZATION" && (
              <div className="space-y-2">
                <Label htmlFor="organizationId" className="text-sm font-medium">
                  組織を選択
                </Label>
                <Select
                  value={selectedOrganizationId}
                  onValueChange={(value) => setSelectedOrganizationId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="組織を選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {organizations.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    組織に所属していません
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid() || createMcpServer.isPending}
            >
              {createMcpServer.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  作成中...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  追加
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

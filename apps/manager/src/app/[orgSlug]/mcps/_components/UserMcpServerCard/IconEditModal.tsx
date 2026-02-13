"use client";

import {
  useState,
  useRef,
  useEffect,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { api } from "@/trpc/react";
import { toast } from "@/utils/client/toast";
import { Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type McpServerId } from "@/schema/ids";
import { McpIconPicker } from "../McpIconPicker";
import { McpServerIcon } from "../McpServerIcon";
import { useImageUpload } from "./hooks/useImageUpload";
import { cn } from "@/lib/utils";

// 保存ボタンのラベルを取得（ネストした三項演算子を回避）
const getSaveButtonLabel = (
  isUploading: boolean,
  isPending: boolean,
): string => {
  if (isUploading) return "アップロード中...";
  if (isPending) return "保存中...";
  return "保存";
};

type IconEditModalProps = {
  serverInstanceId: McpServerId;
  initialIconPath: string | null;
  fallbackUrl?: string | null;
  orgSlug: string;
  onSuccess?: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
};

export const IconEditModal = ({
  serverInstanceId,
  initialIconPath,
  fallbackUrl,
  orgSlug,
  onSuccess,
  onOpenChange,
}: IconEditModalProps) => {
  const [selectedIconPath, setSelectedIconPath] = useState<string | null>(
    initialIconPath,
  );
  const [activeTab, setActiveTab] = useState<"preset" | "upload">("preset");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // アップロード待ちのファイル（保存時にアップロード）
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // プレビュー用のローカルURL（Blob URL）
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  const {
    uploadImage,
    validateFile,
    isUploading,
    error: uploadError,
    setError,
    clearError,
  } = useImageUpload({ orgSlug, mcpServerId: serverInstanceId });

  // コンポーネントアンマウント時にBlob URLを解放
  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const { mutate: updateIconPath, isPending } =
    api.userMcpServer.updateIconPath.useMutation({
      onSuccess: async () => {
        await onSuccess?.();
        toast.success("アイコンを更新しました。");
      },
      onError: () => {
        toast.error(
          "アイコンの更新に失敗しました。しばらく時間を置いてから再度お試しください。",
        );
      },
    });

  const handleSave = async () => {
    let finalIconPath = selectedIconPath;

    // pendingFileがある場合は保存時にアップロード
    if (pendingFile) {
      const result = await uploadImage(pendingFile);
      if (!result) {
        // アップロード失敗（エラーはuseImageUpload内でセット済み）
        return;
      }
      finalIconPath = result.url;
    }

    updateIconPath({
      id: serverInstanceId,
      iconPath: finalIconPath,
    });
  };

  const handleResetToDefault = () => {
    setSelectedIconPath(null);
    // pendingFileとプレビューURLもクリア
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }
    setPendingFile(null);
    setLocalPreviewUrl(null);
    clearError();
  };

  const handleFileSelect = (file: File) => {
    // バリデーションのみ実行（アップロードは保存時）
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    // 古いプレビューURLを解放
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }

    // プレビュー用のローカルURLを生成
    const previewUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(previewUrl);
    setPendingFile(file);
    setSelectedIconPath(null); // lucide:*形式を解除
    clearError();
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const isButtonDisabled = isPending || isUploading;
  // プリセット選択またはアップロード待ちファイルがある場合に変更ありと判定
  const hasChanges =
    selectedIconPath !== initialIconPath || pendingFile !== null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>アイコンを変更</DialogTitle>
          <DialogDescription>
            MCPサーバーのアイコンをカスタマイズします。
          </DialogDescription>
        </DialogHeader>

        {/* 現在のアイコンプレビュー */}
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="text-muted-foreground text-sm">プレビュー</div>
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed">
            {/* アップロード待ちファイルがある場合はローカルプレビュー */}
            {localPreviewUrl ? (
              <McpServerIcon
                iconPath={localPreviewUrl}
                alt="プレビュー"
                size={48}
              />
            ) : (
              <McpServerIcon
                iconPath={selectedIconPath}
                fallbackUrl={fallbackUrl}
                size={48}
              />
            )}
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "preset" | "upload")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preset">プリセット</TabsTrigger>
            <TabsTrigger value="upload">アップロード</TabsTrigger>
          </TabsList>

          <TabsContent value="preset" className="mt-4">
            <McpIconPicker
              selectedIcon={selectedIconPath}
              onIconSelect={setSelectedIconPath}
            />
          </TabsContent>

          <TabsContent value="upload" className="mt-4">
            <div className="space-y-4">
              {/* ドラッグ&ドロップエリア */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/50 border-gray-300 hover:bg-gray-50",
                  isUploading && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileInputChange}
                  className="hidden"
                  disabled={isUploading}
                />
                <Upload className="text-muted-foreground mb-2 h-8 w-8" />
                <p className="text-sm font-medium">
                  {isUploading
                    ? "アップロード中..."
                    : "クリックまたはドラッグ&ドロップ"}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">5MB以下</p>
              </div>

              {/* 注意事項 */}
              <p className="text-muted-foreground text-xs">
                ※ 個人情報や機密情報が含まれていない画像をお使いください
              </p>

              {/* アップロードエラー表示 */}
              {uploadError && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-600">
                  <X className="h-4 w-4" />
                  {uploadError}
                </div>
              )}

              {/* 選択済み画像のプレビュー（アップロード待ち） */}
              {pendingFile && localPreviewUrl && (
                <div className="flex items-center gap-3 rounded-md border p-3">
                  <McpServerIcon
                    iconPath={localPreviewUrl}
                    alt="選択画像"
                    size={40}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {pendingFile.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      保存時にアップロードされます
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (localPreviewUrl) {
                        URL.revokeObjectURL(localPreviewUrl);
                      }
                      setPendingFile(null);
                      setLocalPreviewUrl(null);
                    }}
                    className="h-8 w-8 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* 既存のカスタム画像表示（アップロード済み） */}
              {!pendingFile &&
                selectedIconPath &&
                !selectedIconPath.startsWith("lucide:") && (
                  <div className="flex items-center gap-3 rounded-md border p-3">
                    <McpServerIcon
                      iconPath={selectedIconPath}
                      alt="現在の画像"
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        カスタム画像（設定済み）
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedIconPath(null)}
                      className="h-8 w-8 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleResetToDefault}
            disabled={isButtonDisabled || selectedIconPath === null}
            className="w-full sm:w-auto"
          >
            デフォルトに戻す
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isButtonDisabled}
            >
              キャンセル
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={isButtonDisabled || !hasChanges}
            >
              {getSaveButtonLabel(isUploading, isPending)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

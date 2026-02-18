"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { Upload, X, Building2 } from "lucide-react";
import { z } from "zod";

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
import { McpIconPicker } from "../../mcps/_components/McpIconPicker";
import { McpServerIcon } from "../../mcps/_components/McpServerIcon";
import { cn } from "@/lib/utils";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  UPLOAD_ERROR_MESSAGES,
  type AllowedImageType,
} from "~/lib/upload";

type WorkspaceIconEditModalProps = {
  initialIconPath: string | null;
  orgSlug: string;
  onSave: (iconPath: string | null) => void;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
};

// APIレスポンススキーマ
const UploadSuccessResponseSchema = z.object({
  url: z.string(),
});

const UploadErrorResponseSchema = z.object({
  error: z.string().optional(),
});

// 保存ボタンのラベルを取得
const getSaveButtonLabel = (
  isUploading: boolean,
  isSaving: boolean,
): string => {
  if (isUploading) return "アップロード中...";
  if (isSaving) return "保存中...";
  return "保存";
};

export const WorkspaceIconEditModal = ({
  initialIconPath,
  orgSlug,
  onSave,
  isSaving,
  onOpenChange,
}: WorkspaceIconEditModalProps) => {
  const [selectedIconPath, setSelectedIconPath] = useState<string | null>(
    initialIconPath,
  );
  const [activeTab, setActiveTab] = useState<"preset" | "upload">("preset");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // アップロード待ちのファイル
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  // プレビュー用のローカルURL
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  // Blob URLを解放するヘルパー関数
  const revokePreviewUrl = useCallback(() => {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }
  }, [localPreviewUrl]);

  // コンポーネントアンマウント時にBlob URLを解放
  useEffect(() => {
    return revokePreviewUrl;
  }, [revokePreviewUrl]);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
      return UPLOAD_ERROR_MESSAGES.INVALID_TYPE;
    }
    if (file.size > MAX_FILE_SIZE) {
      return UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE;
    }
    return null;
  }, []);

  const uploadImage = useCallback(
    async (file: File): Promise<{ url: string } | null> => {
      setIsUploading(true);
      setUploadError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("orgSlug", orgSlug);
        formData.append("mcpServerId", `workspace-${orgSlug}`);

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const rawErrorData: unknown = await response.json();
          const validatedError =
            UploadErrorResponseSchema.safeParse(rawErrorData);
          const errorMessage = validatedError.success
            ? (validatedError.data.error ?? UPLOAD_ERROR_MESSAGES.UPLOAD_FAILED)
            : UPLOAD_ERROR_MESSAGES.UPLOAD_FAILED;
          throw new Error(errorMessage);
        }

        const rawData: unknown = await response.json();
        const validatedData = UploadSuccessResponseSchema.safeParse(rawData);

        if (!validatedData.success) {
          throw new Error(UPLOAD_ERROR_MESSAGES.UPLOAD_FAILED);
        }

        setIsUploading(false);
        return { url: validatedData.data.url };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : UPLOAD_ERROR_MESSAGES.UPLOAD_FAILED;
        setUploadError(errorMessage);
        setIsUploading(false);
        return null;
      }
    },
    [orgSlug],
  );

  const handleSave = async () => {
    let finalIconPath = selectedIconPath;

    // pendingFileがある場合は保存時にアップロード
    if (pendingFile) {
      const result = await uploadImage(pendingFile);
      if (!result) {
        return;
      }
      finalIconPath = result.url;
    }

    onSave(finalIconPath);
  };

  // ペンディングファイルとプレビューをクリア
  const clearPendingFile = useCallback(() => {
    revokePreviewUrl();
    setPendingFile(null);
    setLocalPreviewUrl(null);
  }, [revokePreviewUrl]);

  const handleResetToDefault = () => {
    setSelectedIconPath(null);
    clearPendingFile();
    setUploadError(null);
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    revokePreviewUrl();
    const previewUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(previewUrl);
    setPendingFile(file);
    setSelectedIconPath(null);
    setUploadError(null);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
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
    if (file) handleFileSelect(file);
  };

  const isButtonDisabled = isSaving || isUploading;
  const hasChanges =
    selectedIconPath !== initialIconPath || pendingFile !== null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>ロゴを変更</DialogTitle>
          <DialogDescription>
            ワークスペースのロゴをカスタマイズします。
          </DialogDescription>
        </DialogHeader>

        {/* 現在のアイコンプレビュー */}
        <div className="flex flex-col items-center gap-2 py-4">
          <div className="text-muted-foreground text-sm">プレビュー</div>
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed">
            {localPreviewUrl ? (
              <McpServerIcon
                iconPath={localPreviewUrl}
                alt="プレビュー"
                size={48}
              />
            ) : selectedIconPath ? (
              <McpServerIcon iconPath={selectedIconPath} size={48} />
            ) : (
              <Building2 className="h-12 w-12 text-gray-400" />
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

              {/* 選択済み画像のプレビュー */}
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
                    onClick={clearPendingFile}
                    className="h-8 w-8 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* 既存のカスタム画像表示 */}
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
            disabled={
              isButtonDisabled ||
              (selectedIconPath === null && pendingFile === null)
            }
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
              {getSaveButtonLabel(isUploading, isSaving)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useCallback } from "react";

type UploadState = {
  isUploading: boolean;
  error: string | null;
};

type UploadResult = {
  url: string;
};

// サポートする画像形式
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
] as const;

// 最大ファイルサイズ: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * 画像アップロード用カスタムフック
 *
 * /api/files/upload エンドポイントを使用して画像をアップロード
 * - 5MB以下のJPEG/PNG/WebP/SVG/GIFに対応
 * - Cloudflare R2にアップロード
 */
export const useImageUpload = () => {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    error: null,
  });

  const uploadImage = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      // ファイルタイプのバリデーション
      if (
        !ALLOWED_IMAGE_TYPES.includes(
          file.type as (typeof ALLOWED_IMAGE_TYPES)[number],
        )
      ) {
        setState({
          isUploading: false,
          error: "JPEG、PNG、WebP、SVG、GIF形式の画像のみアップロードできます",
        });
        return null;
      }

      // ファイルサイズのバリデーション（5MB）
      if (file.size > MAX_FILE_SIZE) {
        setState({
          isUploading: false,
          error: "ファイルサイズは5MB以下にしてください",
        });
        return null;
      }

      setState({ isUploading: true, error: null });

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error ?? "アップロードに失敗しました");
        }

        const data = await response.json();
        setState({ isUploading: false, error: null });
        return { url: data.url };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "アップロードに失敗しました";
        setState({ isUploading: false, error: errorMessage });
        return null;
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    uploadImage,
    isUploading: state.isUploading,
    error: state.error,
    clearError,
  };
};

import { useState, useCallback } from "react";
import { z } from "zod";

import {
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  UPLOAD_ERROR_MESSAGES,
  type AllowedImageType,
} from "~/lib/upload";

type UploadState = {
  isUploading: boolean;
  error: string | null;
};

type UploadResult = {
  url: string;
};

// APIレスポンススキーマ
const UploadSuccessResponseSchema = z.object({
  url: z.string(),
});

const UploadErrorResponseSchema = z.object({
  error: z.string().optional(),
});

type UseImageUploadOptions = {
  orgSlug: string;
  mcpServerId: string;
};

/**
 * 画像アップロード用カスタムフック
 *
 * /api/files/upload エンドポイントを使用して画像をアップロード
 * - 5MB以下のJPEG/PNG/WebP/GIFに対応
 * - Cloudflare R2にアップロード
 * - orgSlugとmcpServerIdでパスを構成（同じサーバーなら上書き）
 */
export const useImageUpload = (options: UseImageUploadOptions) => {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    error: null,
  });

  const uploadImage = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      // ファイルタイプのバリデーション
      if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
        setState({
          isUploading: false,
          error: UPLOAD_ERROR_MESSAGES.INVALID_TYPE,
        });
        return null;
      }

      // ファイルサイズのバリデーション
      if (file.size > MAX_FILE_SIZE) {
        setState({
          isUploading: false,
          error: UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE,
        });
        return null;
      }

      setState({ isUploading: true, error: null });

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("orgSlug", options.orgSlug);
        formData.append("mcpServerId", options.mcpServerId);

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

        setState({ isUploading: false, error: null });
        return { url: validatedData.data.url };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : UPLOAD_ERROR_MESSAGES.UPLOAD_FAILED;
        setState({ isUploading: false, error: errorMessage });
        return null;
      }
    },
    [options.orgSlug, options.mcpServerId],
  );

  /**
   * ファイルのバリデーションのみ実行（アップロードはしない）
   * プレビュー表示前のチェック用
   */
  const validateFile = useCallback((file: File): string | null => {
    // ファイルタイプのバリデーション
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
      return UPLOAD_ERROR_MESSAGES.INVALID_TYPE;
    }

    // ファイルサイズのバリデーション
    if (file.size > MAX_FILE_SIZE) {
      return UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE;
    }

    return null;
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const setError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  return {
    uploadImage,
    validateFile,
    isUploading: state.isUploading,
    error: state.error,
    clearError,
    setError,
  };
};

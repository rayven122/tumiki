import { unlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { z } from "zod";

/**
 * Google Service Account認証情報のZodスキーマ
 */
export const GoogleCredentialsSchema = z.object({
  type: z.string(),
  project_id: z.string(),
  private_key_id: z.string(),
  private_key: z.string(),
  client_email: z.string(),
  client_id: z.string(),
  auth_uri: z.string(),
  token_uri: z.string(),
  auth_provider_x509_cert_url: z.string(),
  client_x509_cert_url: z.string(),
  universe_domain: z.string().optional(),
});

export type GoogleCredentials = z.infer<typeof GoogleCredentialsSchema>;

/**
 * APIキーまたはインスタンスIDから安全なファイル識別子を生成
 * @param apiKeyOrInstanceId TumikiのAPIキーまたはインスタンスID
 * @returns ファイル名に使用する識別子
 */
const generateFileIdentifier = (apiKeyOrInstanceId?: string): string => {
  if (apiKeyOrInstanceId) {
    // ファイル名に使用できない文字を除去し、長さを制限
    const safeId = apiKeyOrInstanceId
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .substring(0, 50);
    if (safeId) return safeId;
  }
  // フォールバック: タイムスタンプベースのID
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `temp_${timestamp}_${randomPart}`;
};

/**
 * Google認証情報ファイルを一時ディレクトリに作成
 *
 * @param credentials Google認証情報のJSONオブジェクト
 * @param apiKeyOrInstanceId TumikiのAPIキーまたはインスタンスID
 * @returns 作成されたファイルのパス
 */
export const createGoogleCredentialsFile = async (
  credentials: GoogleCredentials,
  apiKeyOrInstanceId?: string,
): Promise<string> => {
  // 認証情報を検証
  const validatedCredentials = GoogleCredentialsSchema.parse(credentials);

  // 一時ディレクトリにAPIキーまたはインスタンスIDを使用したファイル名で保存
  const tempDir = os.tmpdir();
  const fileIdentifier = generateFileIdentifier(apiKeyOrInstanceId);
  const fileName = `gsc-credentials-${fileIdentifier}.json`;
  const filePath = path.join(tempDir, fileName);

  // ファイルに書き込み
  await writeFile(
    filePath,
    JSON.stringify(validatedCredentials, null, 2),
    { mode: 0o600 }, // 読み取り権限を所有者のみに制限
  );

  return filePath;
};

/**
 * Google認証情報ファイルを削除
 *
 * @param filePath 削除するファイルのパス
 */
export const deleteGoogleCredentialsFile = async (
  filePath: string,
): Promise<void> => {
  try {
    await unlink(filePath);
  } catch (error) {
    // ファイルが既に存在しない場合はエラーを無視
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`Failed to delete credentials file: ${filePath}`, error);
    }
  }
};

/**
 * 環境変数オブジェクトにGoogle認証情報ファイルパスを設定
 *
 * @param envVars 既存の環境変数オブジェクト
 * @param credentials Google認証情報
 * @param apiKeyOrInstanceId TumikiのAPIキーまたはインスタンスID
 * @returns 認証情報ファイルパスが設定された環境変数オブジェクトとクリーンアップ関数
 */
export const setupGoogleCredentialsEnv = async (
  envVars: Record<string, string>,
  credentials: GoogleCredentials | null,
  apiKeyOrInstanceId?: string,
): Promise<{
  envVars: Record<string, string>;
  cleanup: () => Promise<void>;
}> => {
  if (!credentials) {
    return {
      envVars,
      cleanup: async () => {
        // No cleanup needed when no credentials are provided
      },
    };
  }

  const filePath = await createGoogleCredentialsFile(
    credentials,
    apiKeyOrInstanceId,
  );

  return {
    envVars: {
      ...envVars,
      GOOGLE_APPLICATION_CREDENTIALS: filePath,
    },
    cleanup: async () => {
      await deleteGoogleCredentialsFile(filePath);
    },
  };
};

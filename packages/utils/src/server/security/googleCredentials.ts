import { unlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { v4 as uuidv4 } from "uuid";
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
 * Google認証情報ファイルを一時ディレクトリに作成
 *
 * @param credentials Google認証情報のJSONオブジェクト
 * @returns 作成されたファイルのパス
 */
export const createGoogleCredentialsFile = async (
  credentials: GoogleCredentials,
): Promise<string> => {
  // 認証情報を検証
  const validatedCredentials = GoogleCredentialsSchema.parse(credentials);

  // 一時ディレクトリにユニークなファイル名で保存
  const tempDir = os.tmpdir();
  const fileName = `gsc-credentials-${uuidv4()}.json`;
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
 * @returns 認証情報ファイルパスが設定された環境変数オブジェクトとクリーンアップ関数
 */
export const setupGoogleCredentialsEnv = async (
  envVars: Record<string, string>,
  credentials: Record<string, unknown> | GoogleCredentials | null | undefined,
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

  // バリデーションを実行してGoogleCredentials型に変換
  const validatedCredentials = GoogleCredentialsSchema.parse(credentials);
  const filePath = await createGoogleCredentialsFile(validatedCredentials);

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

/**
 * OAuthClient リポジトリ
 *
 * DCR結果のキャッシュCRUD操作。clientId/clientSecretは暗号化保存。
 */

import type { PrismaClient } from "@prisma/desktop-client";
import { encryptToken, decryptToken } from "../../utils/encryption";

/** DB 行（findUnique 取得成功時） */
type StoredOAuthClient = NonNullable<
  Awaited<ReturnType<PrismaClient["oAuthClient"]["findUnique"]>>
>;

/** OAuthClient作成/更新の入力型 */
export type UpsertOAuthClientInput = {
  serverUrl: string;
  issuer: string;
  clientId: string;
  clientSecret: string | null;
  tokenEndpointAuthMethod: string;
  authServerMetadata: string;
  isDcr: boolean;
};

/** 復号化済みOAuthClient */
export type DecryptedOAuthClient = {
  id: number;
  serverUrl: string;
  issuer: string;
  clientId: string;
  clientSecret: string | null;
  tokenEndpointAuthMethod: string;
  authServerMetadata: string;
  isDcr: boolean;
};

const toDecryptedClient = async (
  row: StoredOAuthClient,
): Promise<DecryptedOAuthClient> => {
  const clientId = await decryptToken(row.clientId);
  const clientSecret = row.clientSecret
    ? await decryptToken(row.clientSecret)
    : null;

  return {
    id: row.id,
    serverUrl: row.serverUrl,
    issuer: row.issuer,
    clientId,
    clientSecret,
    tokenEndpointAuthMethod: row.tokenEndpointAuthMethod,
    authServerMetadata: row.authServerMetadata,
    isDcr: row.isDcr,
  };
};

/** upsert の create/update に共通するフィールド（暗号化済み） */
const buildEncryptedRowPayload = async (
  input: Omit<UpsertOAuthClientInput, "serverUrl">,
): Promise<{
  issuer: string;
  clientId: string;
  clientSecret: string | null;
  tokenEndpointAuthMethod: string;
  authServerMetadata: string;
  isDcr: boolean;
}> => {
  return {
    issuer: input.issuer,
    clientId: await encryptToken(input.clientId),
    clientSecret: input.clientSecret
      ? await encryptToken(input.clientSecret)
      : null,
    tokenEndpointAuthMethod: input.tokenEndpointAuthMethod,
    authServerMetadata: input.authServerMetadata,
    isDcr: input.isDcr,
  };
};

/**
 * MCPサーバーURLでOAuthClientを検索し、復号化して返す
 */
export const findByServerUrl = async (
  db: PrismaClient,
  serverUrl: string,
): Promise<DecryptedOAuthClient | null> => {
  const record = await db.oAuthClient.findUnique({ where: { serverUrl } });
  if (!record) return null;
  return toDecryptedClient(record);
};

/**
 * OAuthClientを作成または更新（serverUrlで一意）
 */
export const upsertOAuthClient = async (
  db: PrismaClient,
  input: UpsertOAuthClientInput,
): Promise<void> => {
  const { serverUrl, ...rest } = input;
  const data = await buildEncryptedRowPayload(rest);

  await db.oAuthClient.upsert({
    where: { serverUrl },
    create: { serverUrl, ...data },
    update: data,
  });
};

/**
 * 接続のcredentialsを更新（OAuthトークンリフレッシュ後のDB保存用）
 */
export const updateConnectionCredentials = async (
  db: PrismaClient,
  connectionId: number,
  credentials: string,
) => {
  return db.mcpConnection.update({
    where: { id: connectionId },
    data: { credentials },
  });
};

/**
 * MCPサーバーURLでOAuthClientを削除（DCR再登録用）
 */
export const deleteByServerUrl = async (
  db: PrismaClient,
  serverUrl: string,
): Promise<void> => {
  await db.oAuthClient.deleteMany({ where: { serverUrl } });
};

/**
 * 手動入力（isDcr: false）のOAuthClientをserverUrlで検索し、復号化済みクレデンシャルを返す
 */
export const findManualClientByServerUrl = async (
  db: PrismaClient,
  serverUrl: string,
): Promise<{ clientId: string; clientSecret: string | null } | null> => {
  const record = await db.oAuthClient.findFirst({
    where: { serverUrl, isDcr: false },
  });
  if (!record) return null;

  const clientId = await decryptToken(record.clientId);
  const clientSecret = record.clientSecret
    ? await decryptToken(record.clientSecret)
    : null;

  return { clientId, clientSecret };
};

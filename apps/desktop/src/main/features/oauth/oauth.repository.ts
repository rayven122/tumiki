/**
 * OAuthClient リポジトリ
 *
 * DCR結果のキャッシュCRUD操作。clientId/clientSecretは暗号化保存。
 */

import type { PrismaClient } from "@prisma/desktop-client";
import { encryptToken, decryptToken } from "../../utils/encryption";

/** OAuthClient作成/更新の入力型 */
export type UpsertOAuthClientInput = {
  serverUrl: string;
  issuer: string;
  clientId: string;
  clientSecret: string | null;
  tokenEndpointAuthMethod: string;
  authServerMetadata: string;
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

  const clientId = await decryptToken(record.clientId);
  const clientSecret = record.clientSecret
    ? await decryptToken(record.clientSecret)
    : null;

  return {
    id: record.id,
    serverUrl: record.serverUrl,
    issuer: record.issuer,
    clientId,
    clientSecret,
    tokenEndpointAuthMethod: record.tokenEndpointAuthMethod,
    authServerMetadata: record.authServerMetadata,
  };
};

/**
 * OAuthClientを作成または更新（serverUrlで一意）
 */
export const upsertOAuthClient = async (
  db: PrismaClient,
  input: UpsertOAuthClientInput,
): Promise<void> => {
  const encryptedClientId = await encryptToken(input.clientId);
  const encryptedClientSecret = input.clientSecret
    ? await encryptToken(input.clientSecret)
    : null;

  const data = {
    issuer: input.issuer,
    clientId: encryptedClientId,
    clientSecret: encryptedClientSecret,
    tokenEndpointAuthMethod: input.tokenEndpointAuthMethod,
    authServerMetadata: input.authServerMetadata,
  };

  await db.oAuthClient.upsert({
    where: { serverUrl: input.serverUrl },
    create: { serverUrl: input.serverUrl, ...data },
    update: data,
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

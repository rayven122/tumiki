/**
 * OAuthClient リポジトリ
 *
 * DCR結果のキャッシュCRUD操作。clientId/clientSecretは暗号化保存。
 */

import type { PrismaClient } from "@prisma/desktop-client";
import type { DbClient } from "../../shared/db";
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
 * serverUrl から disableRuntimeRefresh フラグだけ取得する軽量lookup。
 * mcp-proxy.service のconfig構築時にランタイムリフレッシュを配線するか判定するのに使う。
 * OAuthClient が存在しない場合は false（=ランタイムリフレッシュ有効）を返す。
 */
export const isRuntimeRefreshDisabled = async (
  db: DbClient,
  serverUrl: string,
): Promise<boolean> => {
  const record = await db.oAuthClient.findUnique({
    where: { serverUrl },
    select: { disableRuntimeRefresh: true },
  });
  return record?.disableRuntimeRefresh ?? false;
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

// secretId 単位で更新することで、同じ secret を指す全コネクションが最新トークンを参照する。
// 再認証成功時は同時に needsReauth フラグもクリアし、UI のバッジ／バナーが即座に消えるようにする。
// DbClient を受けることで $transaction 内（mcp.repository と同じ慣例）からも呼べる。
export const updateSecretCredentials = async (
  db: DbClient,
  secretId: number,
  credentials: string,
): Promise<void> => {
  await db.mcpSecret.update({
    where: { id: secretId },
    data: { credentials, needsReauth: false, lastAuthErrorAt: null },
    select: { id: true },
  });
};

/**
 * refresh が FATAL（invalid_grant 等）失敗した secret に「要再認証」フラグを立てる。
 * 既に true の場合も lastAuthErrorAt は最新に更新する（再発生のトラッキング用）。
 */
export const markSecretNeedsReauth = async (
  db: DbClient,
  secretId: number,
): Promise<void> => {
  await db.mcpSecret.update({
    where: { id: secretId },
    data: { needsReauth: true, lastAuthErrorAt: new Date() },
    select: { id: true },
  });
};

/**
 * tool 呼び出し前の proactive チェック用に needsReauth フラグだけ取得する。
 * 存在しない secretId の場合は null（呼び出し側で「フラグ無し扱い」にフォールバック）。
 */
export const findSecretNeedsReauthById = async (
  db: DbClient,
  secretId: number,
): Promise<boolean | null> => {
  const result = await db.mcpSecret.findUnique({
    where: { id: secretId },
    select: { needsReauth: true },
  });
  return result?.needsReauth ?? null;
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
  const record = await findByServerUrl(db, serverUrl);
  if (!record || record.isDcr) return null;
  return { clientId: record.clientId, clientSecret: record.clientSecret };
};

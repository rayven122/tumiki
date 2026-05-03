import type { AuthToken } from "@prisma/desktop-client";
import { decryptToken } from "../utils/encryption";
import { getAppStore } from "./app-store";
import { getDb } from "./db";

type ManagerRequestOptions = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
};

const findValidAccessToken = async (): Promise<AuthToken | null> => {
  const db = await getDb();
  const token = await db.authToken.findFirst({
    orderBy: { createdAt: "desc" },
  });

  if (!token) return null;

  const now = new Date();
  if (now > token.expiresAt) {
    await db.authToken.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    return null;
  }

  return token;
};

const buildManagerUrl = async (path: string): Promise<string | null> => {
  const store = await getAppStore();
  const managerUrl = store.get("managerUrl");
  if (!managerUrl) return null;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${managerUrl.replace(/\/$/, "")}${normalizedPath}`;
};

/**
 * Manager連携済み・認証済みの場合だけ、internal-manager APIへ認証付きリクエストする。
 *
 * Manager URL未設定、未ログイン、期限切れトークンの場合はnullを返す。
 * fetch自体の通信エラーは呼び出し元で扱えるようにthrowさせる。
 */
export const requestManagerApi = async (
  path: string,
  options: ManagerRequestOptions = {},
): Promise<Response | null> => {
  const url = await buildManagerUrl(path);
  if (!url) return null;

  const token = await findValidAccessToken();
  if (!token) return null;

  const accessToken = await decryptToken(token.accessToken);
  if (!accessToken) return null;

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(url, {
    ...options,
    headers,
  });
};

export const postManagerJson = async (
  path: string,
  body: unknown,
  options: ManagerRequestOptions = {},
): Promise<Response | null> => {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  return requestManagerApi(path, {
    ...options,
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
};

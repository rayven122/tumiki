import { decryptToken } from "../utils/encryption";
import { getAppStore } from "./app-store";
import { findValidAuthToken } from "./auth-token-store";
import { AuthRequiredError } from "../../shared/constants";

type ManagerRequestOptions = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
};

type AuthToken = NonNullable<Awaited<ReturnType<typeof findValidAuthToken>>>;

const getApiBearerToken = async (token: AuthToken): Promise<string | null> => {
  // Jackson の access_token は opaque のため、internal-manager がJWT検証できる id_token を優先する。
  // JWT access_token 対応に切り替えた場合は、この優先順も見直す。
  const encryptedBearerToken = token.idToken ?? token.accessToken;
  if (!encryptedBearerToken) return null;
  const bearerToken = await decryptToken(encryptedBearerToken);
  return bearerToken || null;
};

const buildManagerUrl = async (path: string): Promise<string> => {
  const store = await getAppStore();
  const managerUrl = store.get("managerUrl");
  if (!managerUrl) {
    throw new Error("管理サーバーURLが設定されていません");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${managerUrl.replace(/\/$/, "")}${normalizedPath}`;
};

/**
 * internal-manager APIへ認証付きリクエストする。
 * 個人利用・組織利用とも認証必須のため、未ログインや期限切れトークンはエラーにする。
 * fetch自体の通信エラーは呼び出し元で扱えるようにthrowさせる。
 */
export const requestManagerApi = async (
  path: string,
  options: ManagerRequestOptions = {},
): Promise<Response> => {
  const url = await buildManagerUrl(path);

  const token = await findValidAuthToken();
  if (!token) throw new AuthRequiredError();

  const bearerToken = await getApiBearerToken(token);
  if (!bearerToken) throw new AuthRequiredError();

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${bearerToken}`);

  return fetch(url, {
    ...options,
    headers,
  });
};

export const postManagerApi = async (
  path: string,
  body: unknown,
  options: ManagerRequestOptions = {},
): Promise<Response> => {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  return requestManagerApi(path, {
    ...options,
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
};

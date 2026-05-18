import type { AuthToken } from "@prisma/desktop-client";
import { z } from "zod";
import { decryptToken } from "../utils/encryption";
import { getDb } from "./db";

const DEFAULT_TUMIKI_CLOUD_API_URL = "https://api.tumiki.cloud";
const DEFAULT_TUMIKI_CLOUD_API_TIMEOUT_MS = 30_000;

type TumikiCloudRequestOptions = Omit<RequestInit, "headers"> & {
  headers?: HeadersInit;
};

const toolSearchEmbeddingsResponseSchema = z.object({
  model: z.string(),
  embeddings: z.array(z.array(z.number())),
});

export class TumikiCloudApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = "TumikiCloudApiError";
  }
}

const findValidAuthToken = async (): Promise<AuthToken | null> => {
  const db = await getDb();
  const now = new Date();
  // 通常は1件運用だが、残存時は最も長く使えるトークンを選ぶ。
  const token = await db.authToken.findFirst({
    orderBy: { expiresAt: "desc" },
  });

  if (!token) return null;

  if (token.expiresAt <= now) {
    await db.authToken.deleteMany({
      where: { expiresAt: { lte: now } },
    });
    return null;
  }

  void db.authToken
    .deleteMany({
      where: { expiresAt: { lte: now } },
    })
    .catch((err: unknown) => {
      console.warn(
        "[tumiki-cloud-api-client] Failed to clean expired tokens:",
        err,
      );
    });

  return token;
};

const getTumikiCloudBearerToken = async (
  token: AuthToken,
): Promise<string | null> => {
  // idToken は JWKS 検証可能な OIDC JWT。未保存の場合は accessToken にフォールバックするが、
  // opaque token の場合は api.tumiki.cloud 側の JWT 検証で 401 になる。
  if (!token.idToken && token.accessToken) {
    console.warn(
      "[tumiki-cloud-api-client] idToken not available, falling back to accessToken (may fail JWT verification)",
    );
  }
  const encryptedBearerToken = token.idToken ?? token.accessToken;
  if (!encryptedBearerToken) return null;

  try {
    const bearerToken = await decryptToken(encryptedBearerToken);
    return bearerToken || null;
  } catch (err) {
    console.warn("[tumiki-cloud-api-client] Failed to decrypt token:", err);
    return null;
  }
};

const getTumikiCloudApiBaseUrl = (): string => {
  const configured = process.env.TUMIKI_CLOUD_API_URL?.trim();
  return (configured || DEFAULT_TUMIKI_CLOUD_API_URL).replace(/\/$/, "");
};

const buildTumikiCloudApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getTumikiCloudApiBaseUrl()}${normalizedPath}`;
};

/**
 * Tumiki Cloud API へ認証付きでリクエストする。
 *
 * Desktop の main process 内だけで使用し、renderer へ idToken を公開しない。
 * 未ログイン、期限切れ、復号失敗時は null を返す。
 */
export const requestTumikiCloudApi = async (
  path: string,
  options: TumikiCloudRequestOptions = {},
): Promise<Response | null> => {
  const token = await findValidAuthToken();
  if (!token) return null;

  const bearerToken = await getTumikiCloudBearerToken(token);
  if (!bearerToken) return null;

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${bearerToken}`);

  return fetch(buildTumikiCloudApiUrl(path), {
    ...options,
    headers,
    signal:
      options.signal ??
      AbortSignal.timeout(DEFAULT_TUMIKI_CLOUD_API_TIMEOUT_MS),
  });
};

export const postTumikiCloudApi = async (
  path: string,
  body: unknown,
  options: TumikiCloudRequestOptions = {},
): Promise<Response | null> => {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  return requestTumikiCloudApi(path, {
    ...options,
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
};

export const embedToolSearchTextsWithTumikiCloudApi = async (
  texts: string[],
): Promise<number[][] | null> => {
  const response = await postTumikiCloudApi("/v1/tool-search/embeddings", {
    texts,
  });
  if (!response) return null;

  if (!response.ok) {
    throw new TumikiCloudApiError(
      `Tumiki Cloud API embedding failed: ${response.status}`,
      response.status,
    );
  }

  const parsed = await response
    .json()
    .then((body: unknown) => toolSearchEmbeddingsResponseSchema.parse(body))
    .catch((err: unknown) => {
      throw new TumikiCloudApiError(
        "Tumiki Cloud API returned unexpected response format",
        response.status,
        err,
      );
    });
  return parsed.embeddings;
};

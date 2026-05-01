import "server-only";
import { env } from "@/lib/env";

/** Infisical API クライアント（fetch ベース、SDK 非依存） */

type LoginResponse = { accessToken: string; expiresIn: number };

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Universal Auth で Infisical にログインしアクセストークンを取得する。
 * トークンは expiresIn-30秒 でキャッシュし、再ログインを最小化する。
 */
const getAccessToken = async (): Promise<string> => {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const res = await fetch(
    `${env.INFISICAL_API_URL}/api/v1/auth/universal-auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: env.INFISICAL_OPERATOR_CLIENT_ID,
        clientSecret: env.INFISICAL_OPERATOR_CLIENT_SECRET,
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Infisical login failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as LoginResponse;
  cachedToken = {
    token: data.accessToken,
    expiresAt: Date.now() + (data.expiresIn - 30) * 1000,
  };
  return data.accessToken;
};

const apiFetch = async (
  path: string,
  init: RequestInit = {},
): Promise<Response> => {
  const token = await getAccessToken();
  return fetch(`${env.INFISICAL_API_URL}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
};

type CreateProjectResponse = { project: { id: string; slug: string } };

/**
 * Infisical プロジェクトを作成する。
 * 同一 slug が既存なら 409 で失敗するため、呼び出し側で重複チェック済み前提。
 */
export const createProject = async (params: {
  projectName: string;
  slug: string;
}): Promise<{ projectId: string; projectSlug: string }> => {
  const res = await apiFetch("/api/v2/workspace", {
    method: "POST",
    body: JSON.stringify({
      organizationId: env.INFISICAL_ORG_ID,
      projectName: params.projectName,
      slug: params.slug,
      type: "secret-manager",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`createProject failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as CreateProjectResponse;
  return { projectId: data.project.id, projectSlug: data.project.slug };
};

/**
 * Machine Identity をプロジェクトに紐付ける。
 * 同じ Identity を複数プロジェクトで使い回す際に使用する。
 */
export const addIdentityToProject = async (params: {
  projectId: string;
  identityId: string;
  /** Project Role の slug。デフォルトは developer (read-only) */
  role?: string;
}): Promise<void> => {
  const res = await apiFetch(
    `/api/v2/workspace/${params.projectId}/identity-memberships/${params.identityId}`,
    {
      method: "POST",
      body: JSON.stringify({
        role: params.role ?? "developer",
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`addIdentityToProject failed: ${res.status} ${text}`);
  }
};

/**
 * シークレットを upsert する（存在しなければ POST、存在すれば PATCH）。
 * Infisical API の POST は create / PATCH は update 専用なので、409 (Conflict) を
 * 検知して PATCH にフォールバックする方式で冪等性を担保する。
 */
export const upsertSecrets = async (params: {
  projectId: string;
  environment: string;
  secretsPath: string;
  secrets: Record<string, string>;
}): Promise<void> => {
  for (const [key, value] of Object.entries(params.secrets)) {
    const path = `/api/v3/secrets/raw/${encodeURIComponent(key)}`;
    const body = {
      workspaceId: params.projectId,
      environment: params.environment,
      secretPath: params.secretsPath,
      secretValue: value,
      type: "shared" as const,
    };

    // まず create を試す
    const createRes = await apiFetch(path, {
      method: "POST",
      body: JSON.stringify(body),
    });

    if (createRes.ok) {
      continue;
    }

    // 409 Conflict（既存）なら PATCH で更新する
    if (createRes.status === 409) {
      const updateRes = await apiFetch(path, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (!updateRes.ok) {
        const text = await updateRes.text();
        throw new Error(
          `upsertSecret PATCH(${key}) failed: ${updateRes.status} ${text}`,
        );
      }
      continue;
    }

    const text = await createRes.text();
    throw new Error(
      `upsertSecret POST(${key}) failed: ${createRes.status} ${text}`,
    );
  }
};

/**
 * プロジェクトを削除する（ロールバック用、ベストエフォート）
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  await apiFetch(`/api/v2/workspace/${projectId}`, { method: "DELETE" });
};

type GetSecretResponse = { secret: { secretValue: string } };

/**
 * Infisical からシークレット値を取得する
 */
export const getSecret = async (params: {
  projectId: string;
  environment: string;
  secretPath: string;
  secretName: string;
}): Promise<string> => {
  const query = new URLSearchParams({
    workspaceId: params.projectId,
    environment: params.environment,
    secretPath: params.secretPath,
  });
  const res = await apiFetch(
    `/api/v3/secrets/raw/${encodeURIComponent(params.secretName)}?${query}`,
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `getSecret(${params.secretName}) failed: ${res.status} ${text}`,
    );
  }

  const data = (await res.json()) as GetSecretResponse;
  return data.secret.secretValue;
};

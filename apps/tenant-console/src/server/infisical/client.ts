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

export const createProject = async (params: {
  projectName: string;
  slug: string;
}): Promise<{ projectId: string; projectSlug: string }> => {
  const res = await apiFetch("/api/v2/workspace", {
    method: "POST",
    body: JSON.stringify({
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

export const addIdentityToProject = async (params: {
  projectId: string;
  identityId: string;
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

export const upsertSecrets = async (params: {
  projectId: string;
  environment: string;
  secretsPath: string;
  secrets: Record<string, string>;
}): Promise<void> => {
  for (const [key, value] of Object.entries(params.secrets)) {
    const res = await apiFetch(
      `/api/v3/secrets/raw/${encodeURIComponent(key)}`,
      {
        method: "POST",
        body: JSON.stringify({
          workspaceId: params.projectId,
          environment: params.environment,
          secretPath: params.secretsPath,
          secretValue: value,
          type: "shared",
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`upsertSecret(${key}) failed: ${res.status} ${text}`);
    }
  }
};

export const deleteProject = async (projectId: string): Promise<void> => {
  await apiFetch(`/api/v2/workspace/${projectId}`, { method: "DELETE" });
};

// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import {
  exportJWK,
  exportPKCS8,
  generateKeyPair,
  importPKCS8,
  SignJWT,
  type JWK,
} from "jose";
import { embedMany } from "ai";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import app from "../../../app.js";
import { TOOL_SEARCH_EMBEDDING_CONFIG } from "../../../shared/constants/config.js";
import { resetTumikiJwtCache } from "../../../shared/middleware/verifyTumikiJwt.js";
import {
  resetToolSearchEmbeddingsRateLimit,
  stopToolSearchEmbeddingsRateLimitCleanup,
  toolSearchEmbeddingsRoute,
} from "../route.js";

vi.mock("ai", () => ({
  embedMany: vi.fn(async () => ({
    embeddings: [
      [0.1, 0.2],
      [0.3, 0.4],
    ],
  })),
  gateway: {
    embeddingModel: vi.fn((model: string) => ({ model })),
  },
}));

const issuer = "https://auth.tumiki.cloud/realms/tumiki";
let privateKeyPem: string;
let publicJwk: JWK;

const issueJwt = async (): Promise<string> => {
  const privateKey = await importPKCS8(privateKeyPem, "RS256");
  return new SignJWT({ sub: "user_abc" })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(issuer)
    .setAudience("tumiki-manager")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
};

const stubEnv = () => {
  vi.stubEnv("KEYCLOAK_ISSUER", issuer);
  vi.stubEnv("KEYCLOAK_ALLOWED_AUDIENCES", "tumiki-manager");
  vi.stubEnv("AI_GATEWAY_API_KEY", "gateway-secret");
};

const toUrlString = (input: string | URL | Request): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const stubKeycloakFetch = () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = toUrlString(input);
      if (url.includes("/.well-known/openid-configuration")) {
        return new Response(
          JSON.stringify({
            issuer,
            jwks_uri: `${issuer}/protocol/openid-connect/certs`,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      }

      if (url === `${issuer}/protocol/openid-connect/certs`) {
        return new Response(JSON.stringify({ keys: [publicJwk] }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not Found", { status: 404 });
    }),
  );
};

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", {
    modulusLength: 2048,
    extractable: true,
  });
  privateKeyPem = await exportPKCS8(pair.privateKey);
  publicJwk = {
    ...(await exportJWK(pair.publicKey)),
    kid: "test-key",
    alg: "RS256",
    use: "sig",
  };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  resetTumikiJwtCache();
  resetToolSearchEmbeddingsRateLimit();
  stopToolSearchEmbeddingsRateLimitCleanup();
});

describe("POST /v1/tool-search/embeddings", () => {
  test("認証なしは 401", async () => {
    stubEnv();

    const res = await toolSearchEmbeddingsRoute.request(
      "/v1/tool-search/embeddings",
      {
        method: "POST",
        body: JSON.stringify({ texts: ["hello"] }),
      },
    );

    expect(res.status).toBe(401);
  });

  test("不正なリクエストボディは400", async () => {
    stubEnv();
    stubKeycloakFetch();
    const token = await issueJwt();

    const res = await toolSearchEmbeddingsRoute.request(
      "/v1/tool-search/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ texts: [] }),
      },
    );

    expect(res.status).toBe(400);
  });

  test("不正なJSON bodyは400", async () => {
    stubEnv();
    stubKeycloakFetch();
    const token = await issueJwt();

    const res = await toolSearchEmbeddingsRoute.request(
      "/v1/tool-search/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: "{",
      },
    );

    expect(res.status).toBe(400);
  });

  test("有効なTumiki JWTでembeddingを返す", async () => {
    stubEnv();
    stubKeycloakFetch();
    const token = await issueJwt();

    const res = await toolSearchEmbeddingsRoute.request(
      "/v1/tool-search/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ texts: ["query", "tool text"] }),
      },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({
      model: "text-embedding-3-small",
      embeddings: [
        [0.1, 0.2],
        [0.3, 0.4],
      ],
    });
    expect(embedMany).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { model: "text-embedding-3-small" },
        values: ["query", "tool text"],
      }),
    );
  });

  test("AI_GATEWAY_API_KEY未設定は500を返す", async () => {
    stubEnv();
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    stubKeycloakFetch();
    const token = await issueJwt();

    const res = await toolSearchEmbeddingsRoute.request(
      "/v1/tool-search/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ texts: ["query"] }),
      },
    );

    expect(res.status).toBe(500);
    expect(embedMany).not.toHaveBeenCalled();
  });

  test("embedding生成失敗は500を返す", async () => {
    stubEnv();
    stubKeycloakFetch();
    vi.mocked(embedMany).mockRejectedValueOnce(
      new Error("embedding upstream failed"),
    );
    const token = await issueJwt();

    const res = await toolSearchEmbeddingsRoute.request(
      "/v1/tool-search/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ texts: ["query"] }),
      },
    );

    expect(res.status).toBe(500);
  });

  test("DYNAMIC_SEARCH_EMBEDDING_MODELでモデルを上書きできる", async () => {
    stubEnv();
    vi.stubEnv("DYNAMIC_SEARCH_EMBEDDING_MODEL", "text-embedding-3-large");
    stubKeycloakFetch();
    const token = await issueJwt();

    const res = await toolSearchEmbeddingsRoute.request(
      "/v1/tool-search/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ texts: ["query"] }),
      },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toStrictEqual({
      model: "text-embedding-3-large",
      embeddings: [
        [0.1, 0.2],
        [0.3, 0.4],
      ],
    });
    expect(embedMany).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { model: "text-embedding-3-large" },
      }),
    );
  });

  test("ボディサイズ超過は413", async () => {
    stubEnv();
    const body = JSON.stringify({ texts: ["x".repeat(200 * 1024)] });

    const res = await toolSearchEmbeddingsRoute.request(
      "/v1/tool-search/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer unused-token",
          "Content-Type": "application/json",
          "Content-Length": body.length.toString(),
        },
        body,
      },
    );

    expect(res.status).toBe(413);
  });

  test("レートリミット超過は 429", async () => {
    stubEnv();
    stubKeycloakFetch();
    const token = await issueJwt();

    for (
      let index = 0;
      index < TOOL_SEARCH_EMBEDDING_CONFIG.maxRequestsPerWindow;
      index += 1
    ) {
      const res = await toolSearchEmbeddingsRoute.request(
        "/v1/tool-search/embeddings",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ texts: ["query"] }),
        },
      );
      expect(res.status).toBe(200);
    }

    const res = await toolSearchEmbeddingsRoute.request(
      "/v1/tool-search/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ texts: ["query"] }),
      },
    );

    expect(res.status).toBe(429);
    const retryAfter = Number(res.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);
  });

  test("app全体で /v1/tool-search/embeddings を使える", async () => {
    stubEnv();
    stubKeycloakFetch();
    const token = await issueJwt();

    const res = await app.request("/v1/tool-search/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ texts: ["query"] }),
    });

    expect(res.status).toBe(200);
  });
});

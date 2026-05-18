// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

import { Hono } from "hono";
import {
  exportJWK,
  generateKeyPair,
  importPKCS8,
  exportPKCS8,
  SignJWT,
  type JWK,
} from "jose";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import {
  resetTumikiJwtCache,
  verifyTumikiJwtMiddleware,
  type TumikiJwtContextVariables,
} from "../verifyTumikiJwt.js";

const issuer = "https://auth.tumiki.cloud/realms/tumiki";
let privateKeyPem: string;
let publicJwk: JWK;

const issueJwt = async (
  payload: Record<string, unknown>,
  options: {
    issuer?: string;
    audience?: string;
    expiresIn?: string;
  } = {},
): Promise<string> => {
  const privateKey = await importPKCS8(privateKeyPem, "RS256");
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(options.issuer ?? issuer)
    .setAudience(options.audience ?? "tumiki-manager")
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? "1h")
    .sign(privateKey);
};

const buildTestApp = () => {
  const app = new Hono<{ Variables: TumikiJwtContextVariables }>();
  app.use("/protected", verifyTumikiJwtMiddleware());
  app.get("/protected", (c) => c.json({ ok: true, jwt: c.var.tumikiJwt }));
  return app;
};

const toUrlString = (input: string | URL | Request): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const stubKeycloakEnv = () => {
  vi.stubEnv("KEYCLOAK_ISSUER", issuer);
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

const stubKeycloakFetchWithJwksFailure = () => {
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
        throw new TypeError("JWKS endpoint is unavailable");
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
  resetTumikiJwtCache();
});

describe("verifyTumikiJwtMiddleware", () => {
  test("有効なTumiki JWTで認証が通る", async () => {
    stubKeycloakEnv();
    stubKeycloakFetch();

    const token = await issueJwt({
      sub: "user_abc",
      email: "user@example.com",
      name: "Tumiki User",
    });
    const res = await buildTestApp().request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      jwt: { sub: string; email: string; name: string };
    };
    expect(body.jwt.sub).toBe("user_abc");
    expect(body.jwt.email).toBe("user@example.com");
    expect(body.jwt.name).toBe("Tumiki User");
  });

  test("Authorizationなしは401", async () => {
    stubKeycloakEnv();

    // Authorization ヘッダがなければ discovery / JWKS fetch 前に早期 return する。
    const res = await buildTestApp().request("/protected");

    expect(res.status).toBe(401);
  });

  test("issuer不一致は401", async () => {
    stubKeycloakEnv();
    stubKeycloakFetch();

    const token = await issueJwt(
      { sub: "user_abc" },
      { issuer: "https://evil.example.com" },
    );
    const res = await buildTestApp().request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(401);
  });

  test("KEYCLOAK_ALLOWED_AUDIENCES未設定時はaudienceを検証しない", async () => {
    stubKeycloakEnv();
    stubKeycloakFetch();

    const token = await issueJwt(
      { sub: "user_abc" },
      { audience: "other-client" },
    );
    const res = await buildTestApp().request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
  });

  test("KEYCLOAK_ALLOWED_AUDIENCES設定時はaudience一致で認証が通る", async () => {
    stubKeycloakEnv();
    vi.stubEnv("KEYCLOAK_ALLOWED_AUDIENCES", "tumiki-cloud-api, other-client");
    stubKeycloakFetch();

    const token = await issueJwt(
      { sub: "user_abc" },
      { audience: "tumiki-cloud-api" },
    );
    const res = await buildTestApp().request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(200);
  });

  test("KEYCLOAK_ALLOWED_AUDIENCES設定時はaudience不一致で401", async () => {
    stubKeycloakEnv();
    vi.stubEnv("KEYCLOAK_ALLOWED_AUDIENCES", "tumiki-cloud-api");
    stubKeycloakFetch();

    const token = await issueJwt(
      { sub: "user_abc" },
      { audience: "other-client" },
    );
    const res = await buildTestApp().request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(401);
  });

  test("期限切れJWTは401", async () => {
    stubKeycloakEnv();
    stubKeycloakFetch();

    const token = await issueJwt({ sub: "user_abc" }, { expiresIn: "-120s" });
    const res = await buildTestApp().request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(401);
  });

  test("KEYCLOAK_ISSUER未設定は500", async () => {
    vi.stubEnv("KEYCLOAK_ISSUER", "");
    const token = await issueJwt({ sub: "user_abc" });
    const res = await buildTestApp().request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(500);
  });

  test("JWKS fetch失敗は500", async () => {
    stubKeycloakEnv();
    stubKeycloakFetchWithJwksFailure();

    const token = await issueJwt({ sub: "user_abc" });
    const res = await buildTestApp().request("/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(500);
  });
});

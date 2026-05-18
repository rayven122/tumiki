// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2024-2025 Reyven Inc.

/**
 * Tumiki OIDC JWT 検証ミドルウェア
 *
 * Desktop が Tumiki の Keycloak 認証後に保持する JWT を api.tumiki.cloud 側で検証する。
 * apps/mcp-proxy と同様に openid-client の discovery と jose の JWKS 検証を使う。
 */

import type { Context, MiddlewareHandler, Next } from "hono";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import * as openidClient from "openid-client";
import { allowInsecureRequests } from "openid-client";

export type VerifiedTumikiJwt = {
  sub: string;
  issuer: string;
  email?: string;
  name?: string;
};

export type TumikiJwtContextVariables = {
  tumikiJwt: VerifiedTumikiJwt;
};

type JwksCacheEntry = {
  jwks: ReturnType<typeof createRemoteJWKSet>;
  jwksUri: string;
};

// Keycloak issuer / jwks_uri の変更を反映するにはプロセス再起動が必要。
let serverMetadataCache: openidClient.ServerMetadata | null = null;
let metadataDiscoveringPromise: Promise<openidClient.ServerMetadata> | null =
  null;
let cachedJwks: JwksCacheEntry | null = null;

const isLocalhostUrl = (issuerUrl: string): boolean => {
  try {
    const url = new URL(issuerUrl);
    return (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1" ||
      url.hostname === "[::1]"
    );
  } catch {
    return false;
  }
};

const discoverKeycloakMetadata =
  async (): Promise<openidClient.ServerMetadata> => {
    const keycloakIssuer = process.env.KEYCLOAK_ISSUER?.trim();
    if (!keycloakIssuer) {
      throw new Error("KEYCLOAK_ISSUER environment variable is not set");
    }

    const executeOptions = isLocalhostUrl(keycloakIssuer)
      ? [allowInsecureRequests]
      : undefined;
    const config = await openidClient.discovery(
      new URL(keycloakIssuer),
      "__metadata_only__",
      undefined,
      undefined,
      executeOptions ? { execute: executeOptions } : undefined,
    );

    const metadata = config.serverMetadata();
    serverMetadataCache = metadata;
    return metadata;
  };

const getKeycloakServerMetadata =
  async (): Promise<openidClient.ServerMetadata> => {
    if (serverMetadataCache) return serverMetadataCache;
    if (metadataDiscoveringPromise) return metadataDiscoveringPromise;

    metadataDiscoveringPromise = discoverKeycloakMetadata();
    try {
      return await metadataDiscoveringPromise;
    } finally {
      metadataDiscoveringPromise = null;
    }
  };

const createJwks = (jwksUri: string): ReturnType<typeof createRemoteJWKSet> => {
  const jwks = createRemoteJWKSet(new URL(jwksUri));
  cachedJwks = { jwks, jwksUri };
  return jwks;
};

const getJwks = async (): Promise<ReturnType<typeof createRemoteJWKSet>> => {
  const metadata = await getKeycloakServerMetadata();
  if (!metadata.jwks_uri) {
    throw new Error("JWKS URI not found in Keycloak metadata");
  }

  if (cachedJwks && cachedJwks.jwksUri === metadata.jwks_uri) {
    return cachedJwks.jwks;
  }

  return createJwks(metadata.jwks_uri);
};

const toVerifiedTumikiJwt = (
  payload: JWTPayload,
  issuer: string,
): VerifiedTumikiJwt | null => {
  if (!payload.sub) return null;

  const email = payload.email;
  const name = payload.name;

  return {
    sub: payload.sub,
    issuer,
    email: typeof email === "string" ? email : undefined,
    name: typeof name === "string" ? name : undefined,
  };
};

export const resetTumikiJwtCache = (): void => {
  serverMetadataCache = null;
  metadataDiscoveringPromise = null;
  cachedJwks = null;
};

export const verifyTumikiBearerToken = async (
  bearerToken: string,
): Promise<VerifiedTumikiJwt | null> => {
  const metadata = await getKeycloakServerMetadata();
  const jwks = await getJwks();

  try {
    const { payload } = await jwtVerify(bearerToken, jwks, {
      issuer: metadata.issuer,
      // apps/mcp-proxy と同じ検証境界に揃えるため audience / azp はここでは検証しない。
      // Desktop が保持する idToken を受け取り、issuer・署名・exp・sub を API 境界で確認する。
      // TODO(#1351): api.tumiki.cloud 専用 audience を発行できるようになったら検証を追加する。
      clockTolerance: 60,
      requiredClaims: ["exp", "sub"],
    });

    return toVerifiedTumikiJwt(payload, metadata.issuer);
  } catch {
    return null;
  }
};

export const verifyTumikiJwtMiddleware =
  (): MiddlewareHandler<{ Variables: TumikiJwtContextVariables }> =>
  async (c: Context<{ Variables: TumikiJwtContextVariables }>, next: Next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Missing or invalid Authorization header" }, 401);
    }

    let jwt: VerifiedTumikiJwt | null;
    try {
      jwt = await verifyTumikiBearerToken(authHeader.slice(7));
    } catch (err) {
      console.error("[verifyTumikiJwt] Server misconfiguration:", err);
      return c.json({ error: "Server misconfiguration" }, 500);
    }

    if (!jwt) {
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    c.set("tumikiJwt", jwt);
    await next();
  };

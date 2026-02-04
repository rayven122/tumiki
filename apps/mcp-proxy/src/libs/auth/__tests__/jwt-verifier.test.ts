import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// jose モジュールのモック
vi.mock("jose", () => ({
  jwtVerify: vi.fn(),
}));

// keycloak.ts のモック
vi.mock("../keycloak.js", () => ({
  getKeycloakServerMetadata: vi.fn(),
  getJWKS: vi.fn(),
}));

import { verifyKeycloakJWT } from "../jwt-verifier.js";
import { jwtVerify } from "jose";
import { getKeycloakServerMetadata, getJWKS } from "../keycloak.js";
import type { JWTPayload } from "../../../types/index.js";

// モック関数を取得
const mockJwtVerify = vi.mocked(jwtVerify);
const mockGetKeycloakServerMetadata = vi.mocked(getKeycloakServerMetadata);
const mockGetJWKS = vi.mocked(getJWKS);

describe("verifyKeycloakJWT", () => {
  const mockMetadata = {
    issuer: "https://keycloak.example.com/realms/test",
    jwks_uri:
      "https://keycloak.example.com/realms/test/protocol/openid-connect/certs",
  };

  const mockJwks = { keys: [] };

  const validPayload: JWTPayload = {
    sub: "user-123",
    tumiki: {
      org_id: "org-456",
    },
    email: "user@example.com",
    preferred_username: "testuser",
    iat: Math.floor(Date.now() / 1000) - 60,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: "https://keycloak.example.com/realms/test",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKeycloakServerMetadata.mockResolvedValue(mockMetadata);
    mockGetJWKS.mockResolvedValue(mockJwks as never);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("有効なJWTトークンを検証して成功する", async () => {
    mockJwtVerify.mockResolvedValue({ payload: validPayload } as never);

    const result = await verifyKeycloakJWT("valid-access-token");

    expect(result).toStrictEqual(validPayload);
    expect(mockGetKeycloakServerMetadata).toHaveBeenCalledTimes(1);
    expect(mockGetJWKS).toHaveBeenCalledTimes(1);
    expect(mockJwtVerify).toHaveBeenCalledWith("valid-access-token", mockJwks, {
      issuer: mockMetadata.issuer,
      clockTolerance: 60,
    });
  });

  test("期限切れトークンの場合はエラーをスローする", async () => {
    const expiredError = new Error("Token has expired");
    expiredError.name = "JWTExpired";
    mockJwtVerify.mockRejectedValue(expiredError);

    await expect(verifyKeycloakJWT("expired-token")).rejects.toThrow(
      "Token has expired",
    );
  });

  test("不正な署名の場合はエラーをスローする", async () => {
    const signatureError = new Error("Invalid signature");
    signatureError.name = "JWSSignatureVerificationFailed";
    mockJwtVerify.mockRejectedValue(signatureError);

    await expect(verifyKeycloakJWT("invalid-signature-token")).rejects.toThrow(
      "Invalid signature",
    );
  });

  test("issuer不一致の場合はエラーをスローする", async () => {
    const issuerError = new Error("Unexpected issuer");
    issuerError.name = "JWTClaimValidationFailed";
    mockJwtVerify.mockRejectedValue(issuerError);

    await expect(verifyKeycloakJWT("wrong-issuer-token")).rejects.toThrow(
      "Unexpected issuer",
    );
  });

  test("JWKSフェッチに失敗した場合はエラーをスローする", async () => {
    mockGetJWKS.mockRejectedValue(new Error("Failed to fetch JWKS"));

    await expect(verifyKeycloakJWT("some-token")).rejects.toThrow(
      "Failed to fetch JWKS",
    );
  });

  test("ServerMetadata取得に失敗した場合はエラーをスローする", async () => {
    mockGetKeycloakServerMetadata.mockRejectedValue(
      new Error("Keycloak server unreachable"),
    );

    await expect(verifyKeycloakJWT("some-token")).rejects.toThrow(
      "Keycloak server unreachable",
    );
  });

  test("最小限のペイロードでも検証成功する", async () => {
    const minimalPayload: JWTPayload = {
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    mockJwtVerify.mockResolvedValue({ payload: minimalPayload } as never);

    const result = await verifyKeycloakJWT("minimal-token");

    expect(result).toStrictEqual(minimalPayload);
  });

  test("tumikiカスタムクレームを含むペイロードを正しく返す", async () => {
    const payloadWithTumiki: JWTPayload = {
      sub: "user-abc",
      tumiki: {
        org_id: "org-xyz",
      },
      azp: "tumiki-client",
      scope: "openid profile email",
      realm_access: {
        roles: ["user", "admin"],
      },
    };
    mockJwtVerify.mockResolvedValue({ payload: payloadWithTumiki } as never);

    const result = await verifyKeycloakJWT("tumiki-token");

    expect(result.tumiki?.org_id).toBe("org-xyz");
    expect(result.azp).toBe("tumiki-client");
    expect(result.realm_access?.roles).toStrictEqual(["user", "admin"]);
  });

  test("clockTolerance=60秒で検証する", async () => {
    mockJwtVerify.mockResolvedValue({ payload: validPayload } as never);

    await verifyKeycloakJWT("some-token");

    expect(mockJwtVerify).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      expect.objectContaining({
        clockTolerance: 60,
      }),
    );
  });
});

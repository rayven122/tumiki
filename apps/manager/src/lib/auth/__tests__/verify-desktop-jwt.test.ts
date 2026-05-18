import { describe, test, expect, vi, beforeEach } from "vitest";

const mockGetKeycloakEnv = vi.hoisted(() => vi.fn());

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn().mockReturnValue("mock-jwks"),
  jwtVerify: vi.fn(),
}));

vi.mock("@tumiki/db/server", () => ({
  db: {
    account: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("~/lib/env", () => ({
  getKeycloakEnv: mockGetKeycloakEnv,
}));

import { jwtVerify } from "jose";
import { db } from "@tumiki/db/server";
import { verifyDesktopJwt } from "../verify-desktop-jwt";

const mockJwtVerify = vi.mocked(jwtVerify);
const mockFindUnique = vi.mocked(db.account.findUnique);

const makePayload = (overrides: Record<string, unknown> = {}) => ({
  sub: "keycloak-user-sub-123",
  iss: "https://keycloak.example.com/realms/test",
  aud: "tumiki-desktop",
  exp: Math.floor(Date.now() / 1000) + 3600,
  ...overrides,
});

describe("verifyDesktopJwt", () => {
  beforeEach(() => {
    mockGetKeycloakEnv.mockReturnValue({
      KEYCLOAK_ISSUER: "https://keycloak.example.com/realms/test",
      KEYCLOAK_CLIENT_ID: "tumiki-desktop",
    });
    mockFindUnique.mockResolvedValue({ userId: "user-id-abc" } as never);
  });

  describe("正常系", () => {
    test("有効なid_tokenで認証成功しユーザー情報を返す", async () => {
      mockJwtVerify.mockResolvedValueOnce({ payload: makePayload() } as never);

      const result = await verifyDesktopJwt("Bearer valid-id-token");

      expect(result).toStrictEqual({
        sub: "keycloak-user-sub-123",
        userId: "user-id-abc",
        orgSlug: null,
      });
    });

    test("group_rolesからorgSlugを抽出して返す", async () => {
      const payload = makePayload({
        tumiki: { group_roles: ["/my-org/ADMIN"] },
      });
      mockJwtVerify.mockResolvedValueOnce({ payload } as never);

      const result = await verifyDesktopJwt("Bearer valid-token");

      expect(result.orgSlug).toBe("my-org");
    });

    test("group_rolesが複数ある場合は最初の有効なものを使用する", async () => {
      const payload = makePayload({
        tumiki: { group_roles: ["/first-org/MEMBER", "/second-org/VIEWER"] },
      });
      mockJwtVerify.mockResolvedValueOnce({ payload } as never);

      const result = await verifyDesktopJwt("Bearer valid-token");

      expect(result.orgSlug).toBe("first-org");
    });

    test("access_tokenのazpフォールバックで認証成功する", async () => {
      const audienceError = Object.assign(
        new Error("ERR_JWT_CLAIM_VALIDATION_FAILED"),
        { code: "ERR_JWT_CLAIM_VALIDATION_FAILED", claim: "aud" },
      );
      const accessTokenPayload = makePayload({
        aud: "account",
        azp: "tumiki-desktop",
      });

      mockJwtVerify
        .mockRejectedValueOnce(audienceError)
        .mockResolvedValueOnce({ payload: accessTokenPayload } as never);

      const result = await verifyDesktopJwt("Bearer access-token");

      expect(result.sub).toBe("keycloak-user-sub-123");
      // フォールバック時は audience: "account" で再検証
      expect(mockJwtVerify).toHaveBeenCalledWith(
        "access-token",
        "mock-jwks",
        expect.objectContaining({ audience: "account" }),
      );
    });
  });

  describe("異常系", () => {
    test("Authorizationヘッダーがnullの場合はエラー", async () => {
      await expect(verifyDesktopJwt(null)).rejects.toThrow("Unauthorized");
    });

    test("Bearer プレフィックスがない場合はエラー", async () => {
      await expect(verifyDesktopJwt("Basic some-token")).rejects.toThrow(
        "Unauthorized",
      );
    });

    test("Bearer プレフィックスのみでトークン部分が空の場合はエラー", async () => {
      await expect(verifyDesktopJwt("Bearer ")).rejects.toThrow("Unauthorized");
    });

    test("JWTにsubがない場合はエラー", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: makePayload({ sub: undefined }),
      } as never);

      await expect(verifyDesktopJwt("Bearer no-sub-token")).rejects.toThrow(
        "JWTにsubが含まれていません",
      );
    });

    test("DBにアカウントが存在しない場合はUnauthorizedエラー", async () => {
      mockJwtVerify.mockResolvedValueOnce({ payload: makePayload() } as never);
      mockFindUnique.mockResolvedValueOnce(null);

      await expect(verifyDesktopJwt("Bearer valid-token")).rejects.toThrow(
        "Unauthorized",
      );
    });

    test("azpフォールバックでazpが一致しない場合はエラー", async () => {
      const audienceError = Object.assign(
        new Error("ERR_JWT_CLAIM_VALIDATION_FAILED"),
        { code: "ERR_JWT_CLAIM_VALIDATION_FAILED", claim: "aud" },
      );
      const wrongAzpPayload = makePayload({
        aud: "account",
        azp: "other-client",
      });

      mockJwtVerify
        .mockRejectedValueOnce(audienceError)
        .mockResolvedValueOnce({ payload: wrongAzpPayload } as never);

      await expect(verifyDesktopJwt("Bearer access-token")).rejects.toThrow(
        "Desktopトークンのazpが一致しません",
      );
    });

    test("audience以外のJWT検証エラーはそのまま再スロー", async () => {
      const otherError = Object.assign(new Error("ERR_JWT_EXPIRED"), {
        code: "ERR_JWT_EXPIRED",
      });
      mockJwtVerify.mockRejectedValueOnce(otherError);

      await expect(verifyDesktopJwt("Bearer expired-token")).rejects.toThrow(
        "ERR_JWT_EXPIRED",
      );
    });
  });

  describe("orgSlug抽出パターン", () => {
    test("group_rolesがない場合はnull", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: makePayload({ tumiki: {} }),
      } as never);

      const result = await verifyDesktopJwt("Bearer token");

      expect(result.orgSlug).toBeNull();
    });

    test("tumikiクレームがない場合はnull", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: makePayload(),
      } as never);

      const result = await verifyDesktopJwt("Bearer token");

      expect(result.orgSlug).toBeNull();
    });

    test("tumikiクレームが不正な型の場合はnull（Zodフォールバック）", async () => {
      mockJwtVerify.mockResolvedValueOnce({
        payload: makePayload({ tumiki: "invalid-string" }),
      } as never);

      const result = await verifyDesktopJwt("Bearer token");

      expect(result.orgSlug).toBeNull();
    });

    test("@で始まるorgSlugはスキップされる", async () => {
      const payload = makePayload({
        tumiki: { group_roles: ["/@system/ADMIN", "/valid-org/MEMBER"] },
      });
      mockJwtVerify.mockResolvedValueOnce({ payload } as never);

      const result = await verifyDesktopJwt("Bearer token");

      expect(result.orgSlug).toBe("valid-org");
    });
  });
});

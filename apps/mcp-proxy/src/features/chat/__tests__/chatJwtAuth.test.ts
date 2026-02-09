import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

// モックの設定
vi.mock("../../../shared/logger/index.js", () => ({
  logError: vi.fn(),
}));

vi.mock("../../../infrastructure/keycloak/jwtVerifierImpl.js", () => ({
  verifyKeycloakJWT: vi.fn(),
}));

vi.mock(
  "../../../infrastructure/db/repositories/mcpServerRepository.js",
  () => ({
    checkOrganizationMembership: vi.fn(),
  }),
);

vi.mock("../../../infrastructure/db/repositories/userRepository.js", () => ({
  getUserIdFromKeycloakId: vi.fn(),
  getUserIdByEmail: vi.fn(),
}));

import { verifyChatAuth } from "../chatJwtAuth.js";
import { verifyKeycloakJWT } from "../../../infrastructure/keycloak/jwtVerifierImpl.js";
import { checkOrganizationMembership } from "../../../infrastructure/db/repositories/mcpServerRepository.js";
import {
  getUserIdFromKeycloakId,
  getUserIdByEmail,
} from "../../../infrastructure/db/repositories/userRepository.js";

// モック関数を取得
const mockVerifyKeycloakJWT = vi.mocked(verifyKeycloakJWT);
const mockCheckOrganizationMembership = vi.mocked(checkOrganizationMembership);
const mockGetUserIdFromKeycloakId = vi.mocked(getUserIdFromKeycloakId);
const mockGetUserIdByEmail = vi.mocked(getUserIdByEmail);

describe("verifyChatAuth", () => {
  const organizationId = "org-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Authorizationヘッダーの検証", () => {
    test("Authorizationヘッダーがundefinedの場合はunauthorizedを返す", async () => {
      const result = await verifyChatAuth(undefined, organizationId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("unauthorized");
        expect(result.error.message).toContain("Bearer token required");
      }
    });

    test("Bearer形式でない場合はunauthorizedを返す", async () => {
      const result = await verifyChatAuth("Basic dXNlcjpwYXNz", organizationId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("unauthorized");
        expect(result.error.message).toContain("Bearer token required");
      }
    });
  });

  describe("JWT検証", () => {
    test("期限切れトークンの場合はunauthorizedを返す", async () => {
      mockVerifyKeycloakJWT.mockRejectedValue(new Error("Token has expired"));

      const result = await verifyChatAuth(
        "Bearer expired-token",
        organizationId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("unauthorized");
        expect(result.error.message).toContain("expired");
      }
    });

    test("不正な署名の場合はunauthorizedを返す", async () => {
      mockVerifyKeycloakJWT.mockRejectedValue(
        new Error("Invalid signature detected"),
      );

      const result = await verifyChatAuth(
        "Bearer invalid-sig-token",
        organizationId,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("unauthorized");
        expect(result.error.message).toContain("signature");
      }
    });

    test("その他の検証エラーの場合はunauthorizedを返す", async () => {
      mockVerifyKeycloakJWT.mockRejectedValue(new Error("Unknown JWT error"));

      const result = await verifyChatAuth("Bearer bad-token", organizationId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("unauthorized");
        expect(result.error.message).toContain("Invalid access token");
      }
    });
  });

  describe("ユーザー解決", () => {
    const validPayload = {
      sub: "keycloak-user-123",
      email: "user@example.com",
    };

    beforeEach(() => {
      mockVerifyKeycloakJWT.mockResolvedValue(validPayload);
    });

    test("Keycloak IDでユーザーを解決する", async () => {
      mockGetUserIdFromKeycloakId.mockResolvedValue("tumiki-user-123");
      mockCheckOrganizationMembership.mockResolvedValue(true);

      const result = await verifyChatAuth("Bearer valid-token", organizationId);

      expect(result.success).toBe(true);
      expect(mockGetUserIdFromKeycloakId).toHaveBeenCalledWith(
        "keycloak-user-123",
      );
      expect(mockGetUserIdByEmail).not.toHaveBeenCalled();
    });

    test("Keycloak IDで見つからない場合はemailでフォールバック", async () => {
      mockGetUserIdFromKeycloakId.mockResolvedValue(null);
      mockGetUserIdByEmail.mockResolvedValue("tumiki-user-by-email");
      mockCheckOrganizationMembership.mockResolvedValue(true);

      const result = await verifyChatAuth("Bearer valid-token", organizationId);

      expect(result.success).toBe(true);
      expect(mockGetUserIdByEmail).toHaveBeenCalledWith("user@example.com");
    });

    test("どちらでも見つからない場合はunauthorizedを返す", async () => {
      mockGetUserIdFromKeycloakId.mockResolvedValue(null);
      mockGetUserIdByEmail.mockResolvedValue(null);

      const result = await verifyChatAuth("Bearer valid-token", organizationId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("unauthorized");
        expect(result.error.message).toContain("User not found");
      }
    });

    test("ユーザー解決エラーの場合はunauthorizedを返す", async () => {
      mockGetUserIdFromKeycloakId.mockRejectedValue(
        new Error("User lookup failed"),
      );

      const result = await verifyChatAuth("Bearer valid-token", organizationId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("unauthorized");
        expect(result.error.message).toContain(
          "Failed to verify user identity",
        );
      }
    });
  });

  describe("空文字列バリデーション", () => {
    test("subが空文字列の場合はemailでフォールバックする", async () => {
      mockVerifyKeycloakJWT.mockResolvedValue({
        sub: "",
        email: "user@example.com",
      });
      mockGetUserIdByEmail.mockResolvedValue("tumiki-user-by-email");
      mockCheckOrganizationMembership.mockResolvedValue(true);

      const result = await verifyChatAuth("Bearer valid-token", organizationId);

      expect(result.success).toBe(true);
      expect(mockGetUserIdFromKeycloakId).not.toHaveBeenCalled();
      expect(mockGetUserIdByEmail).toHaveBeenCalledWith("user@example.com");
    });

    test("subが空白文字のみの場合はemailでフォールバックする", async () => {
      mockVerifyKeycloakJWT.mockResolvedValue({
        sub: "   ",
        email: "user@example.com",
      });
      mockGetUserIdByEmail.mockResolvedValue("tumiki-user-by-email");
      mockCheckOrganizationMembership.mockResolvedValue(true);

      const result = await verifyChatAuth("Bearer valid-token", organizationId);

      expect(result.success).toBe(true);
      expect(mockGetUserIdFromKeycloakId).not.toHaveBeenCalled();
      expect(mockGetUserIdByEmail).toHaveBeenCalledWith("user@example.com");
    });

    test("emailが空文字列の場合はスキップされる", async () => {
      mockVerifyKeycloakJWT.mockResolvedValue({
        sub: "keycloak-user-123",
        email: "",
      });
      mockGetUserIdFromKeycloakId.mockResolvedValue(null);

      const result = await verifyChatAuth("Bearer valid-token", organizationId);

      expect(result.success).toBe(false);
      expect(mockGetUserIdByEmail).not.toHaveBeenCalled();
      if (!result.success) {
        expect(result.error.code).toBe("unauthorized");
        expect(result.error.message).toContain("User not found");
      }
    });

    test("emailが空白文字のみの場合はスキップされる", async () => {
      mockVerifyKeycloakJWT.mockResolvedValue({
        sub: "keycloak-user-123",
        email: "   ",
      });
      mockGetUserIdFromKeycloakId.mockResolvedValue(null);

      const result = await verifyChatAuth("Bearer valid-token", organizationId);

      expect(result.success).toBe(false);
      expect(mockGetUserIdByEmail).not.toHaveBeenCalled();
      if (!result.success) {
        expect(result.error.code).toBe("unauthorized");
        expect(result.error.message).toContain("User not found");
      }
    });

    test("subとemailの両方が空文字列の場合はunauthorizedを返す", async () => {
      mockVerifyKeycloakJWT.mockResolvedValue({
        sub: "",
        email: "",
      });

      const result = await verifyChatAuth("Bearer valid-token", organizationId);

      expect(result.success).toBe(false);
      expect(mockGetUserIdFromKeycloakId).not.toHaveBeenCalled();
      expect(mockGetUserIdByEmail).not.toHaveBeenCalled();
      if (!result.success) {
        expect(result.error.code).toBe("unauthorized");
        expect(result.error.message).toContain("User not found");
      }
    });

    test("subが前後に空白を含む場合はtrimして検索する", async () => {
      mockVerifyKeycloakJWT.mockResolvedValue({
        sub: "  keycloak-user-123  ",
        email: "user@example.com",
      });
      mockGetUserIdFromKeycloakId.mockResolvedValue("tumiki-user-123");
      mockCheckOrganizationMembership.mockResolvedValue(true);

      const result = await verifyChatAuth("Bearer valid-token", organizationId);

      expect(result.success).toBe(true);
      expect(mockGetUserIdFromKeycloakId).toHaveBeenCalledWith(
        "keycloak-user-123",
      );
    });

    test("emailが前後に空白を含む場合はtrimして検索する", async () => {
      mockVerifyKeycloakJWT.mockResolvedValue({
        sub: "",
        email: "  user@example.com  ",
      });
      mockGetUserIdByEmail.mockResolvedValue("tumiki-user-by-email");
      mockCheckOrganizationMembership.mockResolvedValue(true);

      const result = await verifyChatAuth("Bearer valid-token", organizationId);

      expect(result.success).toBe(true);
      expect(mockGetUserIdByEmail).toHaveBeenCalledWith("user@example.com");
    });
  });

  describe("組織メンバーシップ検証", () => {
    beforeEach(() => {
      mockVerifyKeycloakJWT.mockResolvedValue({
        sub: "keycloak-user-123",
        email: "user@example.com",
      });
      mockGetUserIdFromKeycloakId.mockResolvedValue("tumiki-user-123");
    });

    test("メンバーでない場合はforbiddenを返す", async () => {
      mockCheckOrganizationMembership.mockResolvedValue(false);

      const result = await verifyChatAuth("Bearer valid-token", organizationId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("forbidden");
        expect(result.error.message).toContain("not a member");
      }
    });

    test("メンバーシップチェックエラーの場合はforbiddenを返す", async () => {
      mockCheckOrganizationMembership.mockRejectedValue(
        new Error("Membership check failed"),
      );

      const result = await verifyChatAuth("Bearer valid-token", organizationId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("forbidden");
        expect(result.error.message).toContain("Membership check failed");
      }
    });
  });

  describe("認証成功", () => {
    beforeEach(() => {
      mockVerifyKeycloakJWT.mockResolvedValue({
        sub: "keycloak-user-123",
        email: "user@example.com",
      });
      mockGetUserIdFromKeycloakId.mockResolvedValue("tumiki-user-123");
      mockCheckOrganizationMembership.mockResolvedValue(true);
    });

    test("認証成功時にcontextが設定される", async () => {
      const result = await verifyChatAuth("Bearer valid-token", organizationId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.context).toStrictEqual({
          organizationId: "org-123",
          userId: "tumiki-user-123",
          jwtPayload: {
            sub: "keycloak-user-123",
            email: "user@example.com",
          },
        });
      }
    });
  });
});

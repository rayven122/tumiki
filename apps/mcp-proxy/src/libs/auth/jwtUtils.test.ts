import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  extractBearerToken,
  verifyJwtToken,
  resolveUserIdFromKeycloak,
  authenticateWithJwt,
} from "./jwtUtils.js";

// モック関数を定義
const mockVerifyKeycloakJWT = vi.fn();
const mockGetUserIdFromKeycloakId = vi.fn();

// jwt-verifier をモック
vi.mock("./jwt-verifier.js", () => ({
  verifyKeycloakJWT: (...args: unknown[]): unknown =>
    mockVerifyKeycloakJWT(...args),
}));

// mcpServerService をモック
vi.mock("../../services/mcpServerService.js", () => ({
  getUserIdFromKeycloakId: (...args: unknown[]): unknown =>
    mockGetUserIdFromKeycloakId(...args),
}));

// logger をモック
vi.mock("../logger/index.js", () => ({
  logError: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("extractBearerToken", () => {
  test("Bearer プレフィックスからトークンを抽出する", () => {
    const token = extractBearerToken("Bearer eyJhbGciOiJSUzI1NiJ9.test");

    expect(token).toBe("eyJhbGciOiJSUzI1NiJ9.test");
  });

  test("Bearer プレフィックスがない場合はnullを返す", () => {
    const token = extractBearerToken("Basic dXNlcjpwYXNz");

    expect(token).toBeNull();
  });

  test("undefinedの場合はnullを返す", () => {
    const token = extractBearerToken(undefined);

    expect(token).toBeNull();
  });

  test("空文字列の場合はnullを返す", () => {
    const token = extractBearerToken("");

    expect(token).toBeNull();
  });

  test("Bearer のみの場合は空文字列を返す", () => {
    const token = extractBearerToken("Bearer ");

    expect(token).toBe("");
  });
});

describe("verifyJwtToken", () => {
  test("有効なトークンの場合は成功を返す", async () => {
    const mockPayload = {
      sub: "keycloak-user-id",
      iss: "https://keycloak.example.com",
      iat: 1234567890,
      exp: 1234567890 + 3600,
    };
    mockVerifyKeycloakJWT.mockResolvedValueOnce(mockPayload);

    const result = await verifyJwtToken("valid-token");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.payload).toStrictEqual(mockPayload);
    }
  });

  test("期限切れトークンの場合はtoken_expiredエラーを返す", async () => {
    mockVerifyKeycloakJWT.mockRejectedValueOnce(
      new Error("Token has expired at 2025-01-01"),
    );

    const result = await verifyJwtToken("expired-token");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("token_expired");
    }
  });

  test("署名が無効な場合はinvalid_signatureエラーを返す", async () => {
    mockVerifyKeycloakJWT.mockRejectedValueOnce(
      new Error("Invalid signature verification failed"),
    );

    const result = await verifyJwtToken("invalid-signature-token");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("invalid_signature");
    }
  });

  test("その他のエラーの場合はinvalid_tokenエラーを返す", async () => {
    mockVerifyKeycloakJWT.mockRejectedValueOnce(new Error("Unknown error"));

    const result = await verifyJwtToken("invalid-token");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("invalid_token");
    }
  });
});

describe("resolveUserIdFromKeycloak", () => {
  test("ユーザーIDが見つかった場合は成功を返す", async () => {
    mockGetUserIdFromKeycloakId.mockResolvedValueOnce("tumiki-user-id");

    const result = await resolveUserIdFromKeycloak("keycloak-id");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.userId).toBe("tumiki-user-id");
    }
    expect(mockGetUserIdFromKeycloakId).toHaveBeenCalledWith("keycloak-id");
  });

  test("ユーザーIDがnullの場合はuser_not_foundエラーを返す", async () => {
    mockGetUserIdFromKeycloakId.mockResolvedValueOnce(null);

    const result = await resolveUserIdFromKeycloak("unknown-keycloak-id");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("user_not_found");
    }
  });

  test("例外が発生した場合はresolution_failedエラーを返す", async () => {
    mockGetUserIdFromKeycloakId.mockRejectedValueOnce(
      new Error("Database error"),
    );

    const result = await resolveUserIdFromKeycloak("keycloak-id");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("resolution_failed");
    }
  });
});

describe("authenticateWithJwt", () => {
  // モックContext作成ヘルパー
  const createMockContext = (authorization: string | undefined) =>
    ({
      req: {
        header: (name: string) => {
          if (name === "Authorization") {
            return authorization;
          }
          return undefined;
        },
      },
    }) as Parameters<typeof authenticateWithJwt>[0];

  test("完全な認証フローが成功する", async () => {
    const mockPayload = {
      sub: "keycloak-user-id",
      iss: "https://keycloak.example.com",
      iat: 1234567890,
      exp: 1234567890 + 3600,
    };
    mockVerifyKeycloakJWT.mockResolvedValueOnce(mockPayload);
    mockGetUserIdFromKeycloakId.mockResolvedValueOnce("tumiki-user-id");

    const context = createMockContext("Bearer valid-token");
    const result = await authenticateWithJwt(context);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.payload).toStrictEqual(mockPayload);
      expect(result.userId).toBe("tumiki-user-id");
    }
  });

  test("Bearerトークンがない場合はno_bearer_tokenエラーを返す", async () => {
    const context = createMockContext(undefined);
    const result = await authenticateWithJwt(context);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("no_bearer_token");
    }
  });

  test("Basicヘッダーの場合はno_bearer_tokenエラーを返す", async () => {
    const context = createMockContext("Basic dXNlcjpwYXNz");
    const result = await authenticateWithJwt(context);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("no_bearer_token");
    }
  });

  test("JWT検証が失敗した場合はそのエラーを返す", async () => {
    mockVerifyKeycloakJWT.mockRejectedValueOnce(new Error("Token has expired"));

    const context = createMockContext("Bearer expired-token");
    const result = await authenticateWithJwt(context);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("token_expired");
    }
  });

  test("ユーザーID解決が失敗した場合はそのエラーを返す", async () => {
    const mockPayload = {
      sub: "keycloak-user-id",
      iss: "https://keycloak.example.com",
      iat: 1234567890,
      exp: 1234567890 + 3600,
    };
    mockVerifyKeycloakJWT.mockResolvedValueOnce(mockPayload);
    mockGetUserIdFromKeycloakId.mockResolvedValueOnce(null);

    const context = createMockContext("Bearer valid-token");
    const result = await authenticateWithJwt(context);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("user_not_found");
    }
  });
});

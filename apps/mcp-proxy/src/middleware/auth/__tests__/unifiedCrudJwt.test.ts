/**
 * 統合MCPサーバーCRUD API用JWT認証ミドルウェアのユニットテスト
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { AuthType, PiiMaskingMode } from "@tumiki/db";
import type { HonoEnv, AuthContext, JWTPayload } from "../../../types/index.js";
import {
  unifiedCrudJwtAuthMiddleware,
  unifiedOwnershipMiddleware,
} from "../unifiedCrudJwt.js";

// モック設定
vi.mock("../../../libs/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
}));

// JWT検証をモック
const mockVerifyKeycloakJWT = vi.fn<(token: string) => Promise<JWTPayload>>();
vi.mock("../../../libs/auth/jwt-verifier.js", () => ({
  verifyKeycloakJWT: (token: string) => mockVerifyKeycloakJWT(token),
}));

// ユーザーID解決をモック
const mockGetUserIdFromKeycloakId =
  vi.fn<(keycloakId: string) => Promise<string | null>>();
const mockCheckOrganizationMembership =
  vi.fn<(organizationId: string, userId: string) => Promise<boolean>>();
vi.mock("../../../services/mcpServerService.js", () => ({
  getUserIdFromKeycloakId: (keycloakId: string) =>
    mockGetUserIdFromKeycloakId(keycloakId),
  checkOrganizationMembership: (organizationId: string, userId: string) =>
    mockCheckOrganizationMembership(organizationId, userId),
}));

// Prisma DBをモック
type McpServerSelectResult = {
  id: string;
  createdBy: string;
  organizationId: string;
  deletedAt: Date | null;
};
const mockFindFirst =
  vi.fn<(args: unknown) => Promise<McpServerSelectResult | null>>();
vi.mock("@tumiki/db/server", async () => {
  const actual = await vi.importActual("@tumiki/db");
  return {
    ...actual,
    db: {
      mcpServer: {
        findFirst: (args: unknown) => mockFindFirst(args),
      },
    },
  };
});

// テスト用の定数
const TEST_ORG_ID = "test-org-id";
const TEST_USER_ID = "test-user-id";
const TEST_CREATOR_ID = "test-creator-id";
const TEST_OTHER_USER_ID = "test-other-user-id";
const TEST_UNIFIED_SERVER_ID = "test-unified-server-id";
const VALID_JWT_TOKEN = "valid.jwt.token";

/**
 * テスト用のJWTペイロードを作成
 */
const createMockJwtPayload = (roles: string[] = ["Member"]): JWTPayload => ({
  sub: "keycloak-user-id",
  iss: "http://keycloak/realms/test",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
  realm_access: {
    roles,
  },
  tumiki: {
    org_id: TEST_ORG_ID,
  },
});

/**
 * テスト用のAuthContextを作成
 */
const createMockAuthContext = (
  userId: string,
  organizationId: string,
): AuthContext => ({
  authMethod: AuthType.OAUTH,
  organizationId,
  userId,
  mcpServerId: "",
  piiMaskingMode: PiiMaskingMode.DISABLED,
  piiInfoTypes: [],
  toonConversionEnabled: false,
  isUnifiedEndpoint: false,
});

/**
 * テスト用の統合サーバーデータを作成
 */
const createMockUnifiedServer = (
  createdBy: string,
  organizationId: string,
) => ({
  id: TEST_UNIFIED_SERVER_ID,
  createdBy,
  organizationId,
  deletedAt: null,
});

describe("unifiedOwnershipMiddleware", () => {
  let app: Hono<HonoEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono<HonoEnv>();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("GET (詳細取得)", () => {
    test("作成者でなくても組織メンバーであればアクセスできる", async () => {
      // 他のユーザーのAuthContextを設定
      app.use("/:id", async (c, next) => {
        c.set(
          "authContext",
          createMockAuthContext(TEST_OTHER_USER_ID, TEST_ORG_ID),
        );
        c.set("jwtPayload", createMockJwtPayload(["Member"]));
        await next();
      });
      app.get("/:id", unifiedOwnershipMiddleware, (c) =>
        c.json({ success: true }),
      );

      // 統合サーバーは別のユーザーが作成
      mockFindFirst.mockResolvedValue(
        createMockUnifiedServer(TEST_CREATOR_ID, TEST_ORG_ID),
      );

      const response = await app.request(`/${TEST_UNIFIED_SERVER_ID}`, {
        method: "GET",
      });

      expect(response.status).toBe(200);
    });

    test("組織が異なる場合はアクセス拒否される", async () => {
      app.use("/:id", async (c, next) => {
        c.set(
          "authContext",
          createMockAuthContext(TEST_USER_ID, "different-org-id"),
        );
        c.set("jwtPayload", createMockJwtPayload(["Member"]));
        await next();
      });
      app.get("/:id", unifiedOwnershipMiddleware, (c) =>
        c.json({ success: true }),
      );

      mockFindFirst.mockResolvedValue(
        createMockUnifiedServer(TEST_CREATOR_ID, TEST_ORG_ID),
      );

      const response = await app.request(`/${TEST_UNIFIED_SERVER_ID}`, {
        method: "GET",
      });

      expect(response.status).toBe(403);
      const body = (await response.json()) as { error: { message: string } };
      expect(body.error.message).toContain("Organization mismatch");
    });
  });

  describe("PUT (更新)", () => {
    test("Admin ロールがあればアクセスできる", async () => {
      app.use("/:id", async (c, next) => {
        c.set(
          "authContext",
          createMockAuthContext(TEST_OTHER_USER_ID, TEST_ORG_ID),
        );
        c.set("jwtPayload", createMockJwtPayload(["Admin"]));
        await next();
      });
      app.put("/:id", unifiedOwnershipMiddleware, (c) =>
        c.json({ success: true }),
      );

      mockFindFirst.mockResolvedValue(
        createMockUnifiedServer(TEST_CREATOR_ID, TEST_ORG_ID),
      );

      const response = await app.request(`/${TEST_UNIFIED_SERVER_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(200);
    });

    test("Owner ロールがあればアクセスできる", async () => {
      app.use("/:id", async (c, next) => {
        c.set(
          "authContext",
          createMockAuthContext(TEST_OTHER_USER_ID, TEST_ORG_ID),
        );
        c.set("jwtPayload", createMockJwtPayload(["Owner"]));
        await next();
      });
      app.put("/:id", unifiedOwnershipMiddleware, (c) =>
        c.json({ success: true }),
      );

      mockFindFirst.mockResolvedValue(
        createMockUnifiedServer(TEST_CREATOR_ID, TEST_ORG_ID),
      );

      const response = await app.request(`/${TEST_UNIFIED_SERVER_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(200);
    });

    test("Member ロールの場合はアクセス拒否される", async () => {
      app.use("/:id", async (c, next) => {
        c.set(
          "authContext",
          createMockAuthContext(TEST_OTHER_USER_ID, TEST_ORG_ID),
        );
        c.set("jwtPayload", createMockJwtPayload(["Member"]));
        await next();
      });
      app.put("/:id", unifiedOwnershipMiddleware, (c) =>
        c.json({ success: true }),
      );

      mockFindFirst.mockResolvedValue(
        createMockUnifiedServer(TEST_CREATOR_ID, TEST_ORG_ID),
      );

      const response = await app.request(`/${TEST_UNIFIED_SERVER_ID}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(403);
      const body = (await response.json()) as { error: { message: string } };
      expect(body.error.message).toContain(
        "Only Owner or Admin can modify unified MCP servers",
      );
    });
  });

  describe("DELETE (削除)", () => {
    test("Admin ロールがあればアクセスできる", async () => {
      app.use("/:id", async (c, next) => {
        c.set(
          "authContext",
          createMockAuthContext(TEST_OTHER_USER_ID, TEST_ORG_ID),
        );
        c.set("jwtPayload", createMockJwtPayload(["Admin"]));
        await next();
      });
      app.delete("/:id", unifiedOwnershipMiddleware, (c) =>
        c.json({ success: true }),
      );

      mockFindFirst.mockResolvedValue(
        createMockUnifiedServer(TEST_CREATOR_ID, TEST_ORG_ID),
      );

      const response = await app.request(`/${TEST_UNIFIED_SERVER_ID}`, {
        method: "DELETE",
      });

      expect(response.status).toBe(200);
    });

    test("Owner ロールがあればアクセスできる", async () => {
      app.use("/:id", async (c, next) => {
        c.set(
          "authContext",
          createMockAuthContext(TEST_OTHER_USER_ID, TEST_ORG_ID),
        );
        c.set("jwtPayload", createMockJwtPayload(["Owner"]));
        await next();
      });
      app.delete("/:id", unifiedOwnershipMiddleware, (c) =>
        c.json({ success: true }),
      );

      mockFindFirst.mockResolvedValue(
        createMockUnifiedServer(TEST_CREATOR_ID, TEST_ORG_ID),
      );

      const response = await app.request(`/${TEST_UNIFIED_SERVER_ID}`, {
        method: "DELETE",
      });

      expect(response.status).toBe(200);
    });

    test("Member ロールの場合はアクセス拒否される", async () => {
      app.use("/:id", async (c, next) => {
        c.set(
          "authContext",
          createMockAuthContext(TEST_OTHER_USER_ID, TEST_ORG_ID),
        );
        c.set("jwtPayload", createMockJwtPayload(["Member"]));
        await next();
      });
      app.delete("/:id", unifiedOwnershipMiddleware, (c) =>
        c.json({ success: true }),
      );

      mockFindFirst.mockResolvedValue(
        createMockUnifiedServer(TEST_CREATOR_ID, TEST_ORG_ID),
      );

      const response = await app.request(`/${TEST_UNIFIED_SERVER_ID}`, {
        method: "DELETE",
      });

      expect(response.status).toBe(403);
    });
  });

  describe("共通チェック", () => {
    test("統合サーバーが存在しない場合は 404 を返す", async () => {
      app.use("/:id", async (c, next) => {
        c.set("authContext", createMockAuthContext(TEST_USER_ID, TEST_ORG_ID));
        c.set("jwtPayload", createMockJwtPayload(["Member"]));
        await next();
      });
      app.get("/:id", unifiedOwnershipMiddleware, (c) =>
        c.json({ success: true }),
      );

      mockFindFirst.mockResolvedValue(null);

      const response = await app.request(`/${TEST_UNIFIED_SERVER_ID}`, {
        method: "GET",
      });

      expect(response.status).toBe(404);
    });

    test("論理削除された統合サーバーの場合は 404 を返す", async () => {
      app.use("/:id", async (c, next) => {
        c.set("authContext", createMockAuthContext(TEST_USER_ID, TEST_ORG_ID));
        c.set("jwtPayload", createMockJwtPayload(["Member"]));
        await next();
      });
      app.get("/:id", unifiedOwnershipMiddleware, (c) =>
        c.json({ success: true }),
      );

      mockFindFirst.mockResolvedValue({
        ...createMockUnifiedServer(TEST_CREATOR_ID, TEST_ORG_ID),
        deletedAt: new Date(),
      });

      const response = await app.request(`/${TEST_UNIFIED_SERVER_ID}`, {
        method: "GET",
      });

      expect(response.status).toBe(404);
    });

    test("認証情報がない場合は 401 を返す", async () => {
      app.get("/:id", unifiedOwnershipMiddleware, (c) =>
        c.json({ success: true }),
      );

      const response = await app.request(`/${TEST_UNIFIED_SERVER_ID}`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });
  });
});

describe("unifiedCrudJwtAuthMiddleware", () => {
  let app: Hono<HonoEnv>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = new Hono<HonoEnv>();
    app.use("/*", unifiedCrudJwtAuthMiddleware);
    app.get("/test", (c) => c.json({ success: true }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test("有効なJWTで認証が成功する", async () => {
    mockVerifyKeycloakJWT.mockResolvedValue(createMockJwtPayload(["Member"]));
    mockGetUserIdFromKeycloakId.mockResolvedValue(TEST_USER_ID);
    mockCheckOrganizationMembership.mockResolvedValue(true);

    const response = await app.request("/test", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${VALID_JWT_TOKEN}`,
      },
    });

    expect(response.status).toBe(200);
  });

  test("Bearerトークンがない場合は 401 を返す", async () => {
    const response = await app.request("/test", {
      method: "GET",
    });

    expect(response.status).toBe(401);
  });

  test("組織メンバーでない場合は 403 を返す", async () => {
    mockVerifyKeycloakJWT.mockResolvedValue(createMockJwtPayload(["Member"]));
    mockGetUserIdFromKeycloakId.mockResolvedValue(TEST_USER_ID);
    mockCheckOrganizationMembership.mockResolvedValue(false);

    const response = await app.request("/test", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${VALID_JWT_TOKEN}`,
      },
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("not a member");
  });

  test("JWTに組織IDがない場合は 403 を返す", async () => {
    const payloadWithoutOrgId = createMockJwtPayload(["Member"]);
    payloadWithoutOrgId.tumiki = undefined;
    mockVerifyKeycloakJWT.mockResolvedValue(payloadWithoutOrgId);
    mockGetUserIdFromKeycloakId.mockResolvedValue(TEST_USER_ID);

    const response = await app.request("/test", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${VALID_JWT_TOKEN}`,
      },
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { message: string } };
    expect(body.error.message).toContain("Organization ID not found");
  });
});

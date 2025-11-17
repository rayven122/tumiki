import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { devKeycloakAuth } from "../auth/jwt.js";
import type { HonoEnv } from "../../types/index.js";

// モックの設定
vi.mock("../../libs/logger/index.js", () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
  logDebug: vi.fn(),
  logWarn: vi.fn(),
}));

describe("devKeycloakAuth", () => {
  let app: Hono<HonoEnv>;
  let originalNodeEnv: string | undefined;
  let originalDevMode: string | undefined;
  let originalAuthBypass: string | undefined;

  beforeEach(() => {
    app = new Hono<HonoEnv>();
    app.use("*", devKeycloakAuth);
    app.get("/test", (c) => {
      const jwtPayload = c.get("jwtPayload");
      return c.json({ jwtPayload });
    });

    // 環境変数を保存
    originalNodeEnv = process.env.NODE_ENV;
    originalDevMode = process.env.DEV_MODE;
    originalAuthBypass = process.env.ENABLE_AUTH_BYPASS;

    vi.clearAllMocks();
  });

  afterEach(() => {
    // 環境変数を復元
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    if (originalDevMode !== undefined) {
      process.env.DEV_MODE = originalDevMode;
    } else {
      delete process.env.DEV_MODE;
    }

    if (originalAuthBypass !== undefined) {
      process.env.ENABLE_AUTH_BYPASS = originalAuthBypass;
    } else {
      delete process.env.ENABLE_AUTH_BYPASS;
    }
  });

  describe("開発モード", () => {
    test("DEV_MODE=true かつ NODE_ENV=development の場合、JWT認証をバイパス", async () => {
      process.env.NODE_ENV = "development";
      process.env.DEV_MODE = "true";
      process.env.ENABLE_AUTH_BYPASS = "true";

      const res = await app.request("/test");

      expect(res.status).toBe(200);
      const body = (await res.json()) as { jwtPayload: unknown };
      expect(body.jwtPayload).toStrictEqual({
        sub: "dev-user-id",
        azp: "dev-client-id",
        scope: "mcp:access:*",
        tumiki: {
          org_id: "dev-org-id",
          is_org_admin: true,
          tumiki_user_id: "dev-user-db-id",
          mcp_instance_id: "dev-mcp-instance-id",
        },
      });
    });

    test("DEV_MODE=false の場合、JWT認証を実行", async () => {
      process.env.NODE_ENV = "development";
      process.env.DEV_MODE = "false";

      // JWT トークンなしでリクエスト（実際の keycloakAuth が動作するが失敗する）
      const res = await app.request("/test");

      // keycloakAuth は Authorization ヘッダーがないと 401 を返すはず
      // ただし、実際の JWKS 取得は失敗する可能性があるため、
      // このテストは環境依存になる
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test("NODE_ENV=production の場合、DEV_MODE=true でもバイパスしない", async () => {
      process.env.NODE_ENV = "production";
      process.env.DEV_MODE = "true";

      const res = await app.request("/test");

      // 本番環境ではバイパスされない
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("ダミーペイロード", () => {
    test("開発モードではダミーのJWTペイロードを設定", async () => {
      process.env.NODE_ENV = "development";
      process.env.DEV_MODE = "true";
      process.env.ENABLE_AUTH_BYPASS = "true";

      const res = await app.request("/test");

      expect(res.status).toBe(200);
      const body = (await res.json()) as { jwtPayload: unknown };

      // ダミーペイロードの内容を確認（tumiki ネスト構造）
      const jwtPayload = body.jwtPayload as {
        sub: string;
        azp: string;
        scope: string;
        tumiki: {
          org_id: string;
          is_org_admin: boolean;
          tumiki_user_id: string;
          mcp_instance_id: string;
        };
      };
      expect(jwtPayload.sub).toBe("dev-user-id");
      expect(jwtPayload.azp).toBe("dev-client-id");
      expect(jwtPayload.scope).toBe("mcp:access:*");
      expect(jwtPayload.tumiki.org_id).toBe("dev-org-id");
      expect(jwtPayload.tumiki.is_org_admin).toBe(true);
      expect(jwtPayload.tumiki.tumiki_user_id).toBe("dev-user-db-id");
      expect(jwtPayload.tumiki.mcp_instance_id).toBe("dev-mcp-instance-id");
    });
  });
});

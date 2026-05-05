import type { JWT } from "next-auth/jwt";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mockEnsureJacksonOidcClients = vi.hoisted(() => vi.fn());

vi.mock("~/server/jackson/oidc-clients", () => ({
  ensureJacksonOidcClients: mockEnsureJacksonOidcClients,
}));

vi.mock("@tumiki/internal-db/server", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

const loadModule = async () => import("../callbacks");

const expiredToken = (): JWT => ({
  accessToken: "old-access-token",
  expiresAt: Math.floor(Date.now() / 1000) - 10,
  refreshToken: "old-refresh-token",
});

describe("jwtCallback", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockEnsureJacksonOidcClients.mockResolvedValue({
      OIDC_ISSUER: "https://idp.example.com",
      OIDC_CLIENT_ID: "web-client",
      OIDC_CLIENT_SECRET: "web-secret",
      OIDC_DESKTOP_CLIENT_ID: "desktop-client",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test("期限切れtokenはOIDC discovery経由でrefreshする", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          token_endpoint: "https://idp.example.com/oauth/token",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          access_token: "new-access-token",
          expires_in: 3600,
          refresh_token: "new-refresh-token",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { jwtCallback } = await loadModule();

    const result = await jwtCallback({ token: expiredToken() });

    expect(result?.accessToken).toBe("new-access-token");
    expect(result?.refreshToken).toBe("new-refresh-token");
    expect(result?.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://idp.example.com/.well-known/openid-configuration",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://idp.example.com/oauth/token",
      expect.objectContaining({
        method: "POST",
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: "web-client",
          client_secret: "web-secret",
          refresh_token: "old-refresh-token",
        }),
      }),
    );
  });

  test("refresh endpoint失敗時はnullを返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          Response.json({
            token_endpoint: "https://idp.example.com/oauth/token",
          }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 400 })),
    );
    const { jwtCallback } = await loadModule();

    await expect(jwtCallback({ token: expiredToken() })).resolves.toBeNull();
  });

  test("OIDC設定取得失敗時はnullを返す", async () => {
    mockEnsureJacksonOidcClients.mockRejectedValue(
      new Error("OIDC is not configured"),
    );
    vi.stubGlobal("fetch", vi.fn<typeof fetch>());
    const { jwtCallback } = await loadModule();

    await expect(jwtCallback({ token: expiredToken() })).resolves.toBeNull();
  });
});

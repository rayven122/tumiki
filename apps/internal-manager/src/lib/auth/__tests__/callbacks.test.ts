import type { Account, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mockEnsureJacksonOidcClients = vi.hoisted(() => vi.fn());
const mockFindUnique = vi.hoisted(() => vi.fn());
const mockUpdateMany = vi.hoisted(() => vi.fn());
const mockGetTumikiClaims = vi.hoisted(() => vi.fn());
const MockOidcNotConfiguredError = vi.hoisted(
  () =>
    class OidcNotConfiguredError extends Error {
      override readonly name = "OidcNotConfiguredError";
    },
);

vi.mock("~/server/jackson/oidc-clients", () => ({
  ensureJacksonOidcClients: mockEnsureJacksonOidcClients,
  OidcNotConfiguredError: MockOidcNotConfiguredError,
}));

vi.mock("@tumiki/internal-db/server", () => ({
  db: {
    user: {
      findUnique: mockFindUnique,
      updateMany: mockUpdateMany,
    },
  },
}));

vi.mock("../get-tumiki-claims", () => ({
  getTumikiClaims: mockGetTumikiClaims,
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
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockEnsureJacksonOidcClients.mockResolvedValue({
      OIDC_ISSUER: "https://idp.example.com",
      OIDC_CLIENT_ID: "web-client",
      OIDC_CLIENT_SECRET: "web-secret",
      OIDC_DESKTOP_CLIENT_ID: "desktop-client",
    });
    mockFindUnique.mockResolvedValue({ role: "SYSTEM_ADMIN" });
    mockUpdateMany.mockResolvedValue({ count: 1 });
    mockGetTumikiClaims.mockResolvedValue({
      org_slugs: ["engineering"],
      org_id: "org-1",
      org_slug: "engineering",
      roles: ["admin"],
      group_roles: ["group-admin"],
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
    const discoveryCall = fetchMock.mock.calls[0];
    expect(discoveryCall?.[0]).toBe(
      "https://idp.example.com/.well-known/openid-configuration",
    );
    expect(discoveryCall?.[1]?.signal).toBeInstanceOf(AbortSignal);
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

  test("refresh endpointのレスポンス形式が不正な場合はnullを返す", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          Response.json({
            token_endpoint: "https://idp.example.com/oauth/token",
          }),
        )
        .mockResolvedValueOnce(Response.json({ access_token: "missing-exp" })),
    );
    const { jwtCallback } = await loadModule();

    await expect(jwtCallback({ token: expiredToken() })).resolves.toBeNull();
  });

  test("同じissuerのOIDC discoveryは並行refreshで1回にまとめる", async () => {
    let resolveDiscovery: ((response: Response) => void) | undefined;
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveDiscovery = resolve;
        }),
      )
      .mockResolvedValueOnce(
        Response.json({ access_token: "new-access-token-1", expires_in: 3600 }),
      )
      .mockResolvedValueOnce(
        Response.json({ access_token: "new-access-token-2", expires_in: 3600 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { jwtCallback } = await loadModule();

    const first = jwtCallback({ token: expiredToken() });
    const second = jwtCallback({ token: expiredToken() });
    resolveDiscovery?.(
      Response.json({ token_endpoint: "https://idp.example.com/oauth/token" }),
    );

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://idp.example.com/.well-known/openid-configuration",
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  test("refresh endpointの一時障害時は既存tokenを維持する", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          Response.json({
            token_endpoint: "https://idp.example.com/oauth/token",
          }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 503 })),
    );
    const { jwtCallback } = await loadModule();
    const token = expiredToken();

    await expect(jwtCallback({ token })).resolves.toStrictEqual(token);
  });

  test("OIDC discoveryの一時障害時は既存tokenを維持する", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockRejectedValueOnce(new Error("network down")),
    );
    const { jwtCallback } = await loadModule();
    const token = expiredToken();

    await expect(jwtCallback({ token })).resolves.toStrictEqual(token);
  });

  test("OIDC設定取得失敗時はnullを返す", async () => {
    mockEnsureJacksonOidcClients.mockRejectedValue(
      new MockOidcNotConfiguredError("OIDC is not configured"),
    );
    vi.stubGlobal("fetch", vi.fn<typeof fetch>());
    const { jwtCallback } = await loadModule();

    await expect(jwtCallback({ token: expiredToken() })).resolves.toBeNull();
  });

  test("初回サインイン時はOIDC profileからtokenとtumikiクレームを設定する", async () => {
    const { jwtCallback } = await loadModule();

    const result = await jwtCallback({
      token: {},
      user: { id: "user-1", email: "user@example.com" },
      account: {
        provider: "oidc",
        access_token: "access-token",
        expires_at: 1_800_000_000,
        refresh_token: "refresh-token",
      } as Account,
      profile: {
        sub: "oidc-sub-1",
        email: "user@example.com",
        name: "Tumiki User",
        picture: "https://example.com/avatar.png",
        tumiki: { group_roles: ["group-admin"] },
      },
    });

    expect(result).toStrictEqual({
      sub: "user-1",
      role: "SYSTEM_ADMIN",
      accessToken: "access-token",
      expiresAt: 1_800_000_000,
      refreshToken: "refresh-token",
      oidcSub: "oidc-sub-1",
      email: "user@example.com",
      name: "Tumiki User",
      picture: "https://example.com/avatar.png",
      provider: "oidc",
      tumiki: {
        org_slugs: ["engineering"],
        org_id: "org-1",
        org_slug: "engineering",
        roles: ["admin"],
        group_roles: ["group-admin"],
      },
    });
    expect(mockGetTumikiClaims).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "oidc",
      "oidc-sub-1",
      ["group-admin"],
    );
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { image: "https://example.com/avatar.png" },
    });
  });

  test("セッション更新時はtumikiクレームとroleをDBから再取得する", async () => {
    mockGetTumikiClaims.mockResolvedValue({
      org_slugs: ["sales"],
      org_id: "org-2",
      org_slug: "sales",
      roles: ["member"],
      group_roles: ["group-member"],
    });
    const { jwtCallback } = await loadModule();

    const result = await jwtCallback({
      token: {
        sub: "user-1",
        provider: "oidc",
        oidcSub: "oidc-sub-1",
        tumiki: {
          org_slugs: ["engineering"],
          org_id: "org-1",
          org_slug: "engineering",
          roles: ["admin"],
          group_roles: ["group-admin"],
        },
      },
    });

    expect(result?.role).toBe("SYSTEM_ADMIN");
    expect(result?.tumiki).toStrictEqual({
      org_slugs: ["sales"],
      org_id: "org-2",
      org_slug: "sales",
      roles: ["member"],
      group_roles: ["group-member"],
    });
    expect(mockGetTumikiClaims).toHaveBeenCalledWith(
      expect.anything(),
      "user-1",
      "oidc",
      "oidc-sub-1",
      ["group-admin"],
    );
  });

  test("sessionCallbackはtoken情報をsessionへ反映する", async () => {
    const { sessionCallback } = await loadModule();
    const session = {
      user: {
        id: "",
        sub: "",
        email: null,
        name: null,
        image: null,
        role: "USER",
        tumiki: null,
      },
      expires: "2099-01-01T00:00:00.000Z",
    } satisfies Session;

    const result = await sessionCallback({
      session,
      token: {
        sub: "user-1",
        email: "user@example.com",
        name: "Tumiki User",
        picture: "https://example.com/avatar.png",
        role: "SYSTEM_ADMIN",
        accessToken: "access-token",
        tumiki: {
          org_slugs: ["engineering"],
          org_id: "org-1",
          org_slug: "engineering",
          roles: ["admin"],
          group_roles: ["group-admin"],
        },
      },
    });

    expect(result).toStrictEqual({
      user: {
        id: "user-1",
        sub: "user-1",
        email: "user@example.com",
        name: "Tumiki User",
        image: "https://example.com/avatar.png",
        role: "SYSTEM_ADMIN",
        tumiki: {
          org_slugs: ["engineering"],
          org_id: "org-1",
          org_slug: "engineering",
          roles: ["admin"],
          group_roles: ["group-admin"],
        },
      },
      expires: "2099-01-01T00:00:00.000Z",
    });
  });
});

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { createRemoteJWKSet, jwtVerify } from "jose";

type FindFirstIdentityArgs = {
  where: { sub: string; provider: "oidc" };
  select: { userId: true };
};
type FindFirstUserArgs = {
  where: { email: string };
  select: { id: true };
};
type UpsertIdentityArgs = {
  where: { provider_sub: { provider: string; sub: string } };
  create: { userId: string; provider: string; sub: string };
  update: Record<string, never>;
};

const issuer = "https://idp.example.com/realms/tumiki";
const clientId = "tumiki-internal";
const desktopClientId = "tumiki-desktop";
let currentIssuer = issuer;
const mockJwks = vi.fn() as unknown as ReturnType<typeof createRemoteJWKSet>;
const mockCreateRemoteJWKSet = vi.fn<typeof createRemoteJWKSet>();
const mockJwtVerify = vi.fn<typeof jwtVerify>();
const mockFetch = vi.fn<typeof fetch>();
const mockFindFirstIdentity =
  vi.fn<(args: FindFirstIdentityArgs) => Promise<{ userId: string } | null>>();
const mockFindFirstUser =
  vi.fn<(args: FindFirstUserArgs) => Promise<{ id: string } | null>>();
const mockUpsertIdentity = vi.fn<(args: UpsertIdentityArgs) => Promise<void>>();

const loadModule = async () => {
  vi.doMock("jose", () => ({
    createRemoteJWKSet: mockCreateRemoteJWKSet,
    jwtVerify: mockJwtVerify,
  }));
  vi.doMock("~/server/jackson/oidc-clients", () => ({
    ensureJacksonOidcClients: () => ({
      OIDC_ISSUER: currentIssuer,
      OIDC_CLIENT_ID: clientId,
      OIDC_CLIENT_SECRET: "internal-secret",
      OIDC_DESKTOP_CLIENT_ID: desktopClientId,
    }),
  }));
  vi.doMock("@tumiki/internal-db/server", () => ({
    db: {
      externalIdentity: {
        findFirst: mockFindFirstIdentity,
        upsert: mockUpsertIdentity,
      },
      user: {
        findFirst: mockFindFirstUser,
      },
    },
  }));
  vi.stubGlobal("fetch", mockFetch);

  return import("../verify-desktop-jwt");
};

const buildDiscoveryResponse = () =>
  ({
    ok: true,
    json: async () => ({
      jwks_uri: `${currentIssuer}/protocol/openid-connect/certs`,
    }),
  }) as Response;

beforeEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  currentIssuer = issuer;

  mockCreateRemoteJWKSet.mockReturnValue(mockJwks);
  mockJwtVerify.mockResolvedValue({
    payload: { sub: "oidc-sub", aud: desktopClientId },
    protectedHeader: { alg: "RS256" },
    key: new Uint8Array(),
  });
  mockFindFirstIdentity.mockResolvedValue({ userId: "user-001" });
  mockFindFirstUser.mockResolvedValue(null);
  mockUpsertIdentity.mockResolvedValue(undefined);
  mockFetch.mockResolvedValue(buildDiscoveryResponse());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("verifyDesktopJwt", () => {
  test("Authorizationヘッダーがない場合はUnauthorizedエラーを返す", async () => {
    const { verifyDesktopJwt } = await loadModule();

    await expect(verifyDesktopJwt(null)).rejects.toThrow("Unauthorized");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("Bearer形式でない場合はUnauthorizedエラーを返す", async () => {
    const { verifyDesktopJwt } = await loadModule();

    await expect(verifyDesktopJwt("Basic token-001")).rejects.toThrow(
      "Unauthorized",
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test("Desktop client IDをaudienceとしてJWTを検証する", async () => {
    const { verifyDesktopJwt } = await loadModule();

    const result = await verifyDesktopJwt("Bearer token-001");

    expect(result).toStrictEqual({ sub: "oidc-sub", userId: "user-001" });
    expect(mockJwtVerify).toHaveBeenCalledWith("token-001", mockJwks, {
      issuer,
      audience: desktopClientId,
    });
  });

  test("Keycloak access tokenのazpがDesktop client IDなら許可する", async () => {
    mockJwtVerify
      .mockRejectedValueOnce({
        code: "ERR_JWT_CLAIM_VALIDATION_FAILED",
        claim: "aud",
      })
      .mockResolvedValueOnce({
        payload: { sub: "oidc-sub", aud: "account", azp: desktopClientId },
        protectedHeader: { alg: "RS256" },
        key: new Uint8Array(),
      });
    const { verifyDesktopJwt } = await loadModule();

    const result = await verifyDesktopJwt("Bearer token-001");

    expect(result).toStrictEqual({ sub: "oidc-sub", userId: "user-001" });
    expect(mockJwtVerify).toHaveBeenCalledTimes(2);
  });

  test("audienceとazpがDesktop client IDに一致しない場合はエラーを返す", async () => {
    mockJwtVerify
      .mockRejectedValueOnce({
        code: "ERR_JWT_CLAIM_VALIDATION_FAILED",
        claim: "aud",
      })
      .mockResolvedValueOnce({
        payload: { sub: "oidc-sub", aud: "account", azp: "other-client" },
        protectedHeader: { alg: "RS256" },
        key: new Uint8Array(),
      });
    const { verifyDesktopJwt } = await loadModule();

    await expect(verifyDesktopJwt("Bearer token-001")).rejects.toThrow(
      "Desktopトークンのazpが一致しません",
    );
  });

  test("subクレームがない場合はエラーを返す", async () => {
    mockJwtVerify.mockResolvedValueOnce({
      payload: { aud: desktopClientId },
      protectedHeader: { alg: "RS256" },
      key: new Uint8Array(),
    });
    const { verifyDesktopJwt } = await loadModule();

    await expect(verifyDesktopJwt("Bearer token-001")).rejects.toThrow(
      "Missing token subject",
    );
  });

  test("ExternalIdentityがなくemailクレームもない場合はエラーを返す", async () => {
    mockFindFirstIdentity.mockResolvedValueOnce(null);
    // emailクレームなし（デフォルトのpayload）
    const { verifyDesktopJwt } = await loadModule();

    await expect(verifyDesktopJwt("Bearer token-001")).rejects.toThrow(
      "External identity not found",
    );
    expect(mockUpsertIdentity).not.toHaveBeenCalled();
  });

  test("SCIMユーザー初回デスクトップログイン: emailでユーザーを検索しExternalIdentityをJIT作成する", async () => {
    mockFindFirstIdentity.mockResolvedValueOnce(null);
    mockJwtVerify.mockResolvedValueOnce({
      payload: {
        sub: "oidc-sub",
        aud: desktopClientId,
        email: "member@example.com",
      },
      protectedHeader: { alg: "RS256" },
      key: new Uint8Array(),
    });
    mockFindFirstUser.mockResolvedValueOnce({ id: "user-scim-001" });
    const { verifyDesktopJwt } = await loadModule();

    const result = await verifyDesktopJwt("Bearer token-001");

    expect(result).toStrictEqual({ sub: "oidc-sub", userId: "user-scim-001" });
    expect(mockFindFirstUser).toHaveBeenCalledWith({
      where: { email: "member@example.com" },
      select: { id: true },
    });
    expect(mockUpsertIdentity).toHaveBeenCalledWith({
      where: { provider_sub: { provider: "oidc", sub: "oidc-sub" } },
      create: { userId: "user-scim-001", provider: "oidc", sub: "oidc-sub" },
      update: {},
    });
  });

  test("SCIMユーザー初回デスクトップログイン: emailがDBに存在しない場合はエラーを返す", async () => {
    mockFindFirstIdentity.mockResolvedValueOnce(null);
    mockJwtVerify.mockResolvedValueOnce({
      payload: {
        sub: "oidc-sub",
        aud: desktopClientId,
        email: "unknown@example.com",
      },
      protectedHeader: { alg: "RS256" },
      key: new Uint8Array(),
    });
    mockFindFirstUser.mockResolvedValueOnce(null);
    const { verifyDesktopJwt } = await loadModule();

    await expect(verifyDesktopJwt("Bearer token-001")).rejects.toThrow(
      "External identity not found",
    );
    expect(mockUpsertIdentity).not.toHaveBeenCalled();
  });

  test("JWKS discoveryをTTL内で再利用する", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const { verifyDesktopJwt } = await loadModule();

    await verifyDesktopJwt("Bearer token-001");
    await vi.advanceTimersByTimeAsync(9 * 60 * 1000);
    await verifyDesktopJwt("Bearer token-002");
    await vi.advanceTimersByTimeAsync(61 * 1000);
    await verifyDesktopJwt("Bearer token-003");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockCreateRemoteJWKSet).toHaveBeenCalledTimes(2);
  });

  test("OIDC issuerが変わった場合はTTL内でもJWKS discoveryを再取得する", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    const { verifyDesktopJwt } = await loadModule();

    await verifyDesktopJwt("Bearer token-001");
    currentIssuer = "https://idp-alt.example.com/realms/tumiki";
    await vi.advanceTimersByTimeAsync(30 * 1000);
    await verifyDesktopJwt("Bearer token-002");

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1]?.[0]).toBe(
      "https://idp-alt.example.com/realms/tumiki/.well-known/openid-configuration",
    );
    expect(mockCreateRemoteJWKSet).toHaveBeenCalledTimes(2);
  });

  test("同時実行されたJWKS discoveryを1回にまとめる", async () => {
    let resolveDiscovery: ((response: Response) => void) | undefined;
    mockFetch.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveDiscovery = resolve;
      }),
    );
    const { verifyDesktopJwt } = await loadModule();

    const first = verifyDesktopJwt("Bearer token-001");
    const second = verifyDesktopJwt("Bearer token-002");
    resolveDiscovery?.(buildDiscoveryResponse());

    const results = await Promise.all([first, second]);

    expect(results).toStrictEqual([
      { sub: "oidc-sub", userId: "user-001" },
      { sub: "oidc-sub", userId: "user-001" },
    ]);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("JWKS discovery失敗後は次回リクエストで再試行する", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce(buildDiscoveryResponse());
    const { verifyDesktopJwt } = await loadModule();

    await expect(verifyDesktopJwt("Bearer token-001")).rejects.toThrow(
      "OIDCディスカバリ取得失敗",
    );
    const result = await verifyDesktopJwt("Bearer token-002");

    expect(result).toStrictEqual({ sub: "oidc-sub", userId: "user-001" });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("JWKS discoveryにjwks_uriがない場合はエラーを返す", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    } as Response);
    const { verifyDesktopJwt } = await loadModule();

    await expect(verifyDesktopJwt("Bearer token-001")).rejects.toThrow(
      "OIDCディスカバリにjwks_uriが含まれていません",
    );
  });

  test("JWKS discoveryが応答しない場合はタイムアウトする", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    mockFetch.mockImplementation((_input, init) => {
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    });
    const { verifyDesktopJwt } = await loadModule();

    const result = expect(verifyDesktopJwt("Bearer token-001")).rejects.toThrow(
      "OIDCディスカバリ取得失敗",
    );
    await vi.advanceTimersByTimeAsync(5 * 1000);

    await result;
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

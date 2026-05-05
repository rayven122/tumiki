import { beforeEach, describe, expect, test, vi } from "vitest";

const mockEnsureJacksonOidcClients = vi.hoisted(() => vi.fn());

vi.mock("~/server/jackson/oidc-clients", () => ({
  ensureJacksonOidcClients: mockEnsureJacksonOidcClients,
}));

describe("GET /api/auth/config", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  test("Desktop client IDをclientIdとして返す", async () => {
    mockEnsureJacksonOidcClients.mockResolvedValue({
      OIDC_ISSUER: "http://localhost:8888/realms/tumiki",
      OIDC_CLIENT_ID: "tumiki-internal-manager",
      OIDC_CLIENT_SECRET: "secret",
      OIDC_DESKTOP_CLIENT_ID: "tumiki-desktop",
    });
    const { GET } = await import("./route");

    const response = await GET();

    await expect(response.json()).resolves.toStrictEqual({
      issuer: "http://localhost:8888/realms/tumiki",
      clientId: "tumiki-desktop",
    });
  });
});

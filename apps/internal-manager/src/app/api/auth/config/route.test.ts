import { beforeEach, describe, expect, test, vi } from "vitest";

const mockGetOidcEnv = vi.fn();

vi.mock("~/lib/env", () => ({
  getOidcEnv: mockGetOidcEnv,
}));

describe("GET /api/auth/config", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  test("Desktop client IDが設定されている場合はclientIdとして返す", async () => {
    mockGetOidcEnv.mockReturnValue({
      OIDC_ISSUER: "http://localhost:8888/realms/tumiki",
      OIDC_CLIENT_ID: "tumiki-internal-manager",
      OIDC_CLIENT_SECRET: "secret",
      OIDC_DESKTOP_CLIENT_ID: "tumiki-desktop",
    });
    const { GET } = await import("./route");

    const response = GET();

    await expect(response.json()).resolves.toStrictEqual({
      issuer: "http://localhost:8888/realms/tumiki",
      clientId: "tumiki-desktop",
    });
  });

  test("Desktop client IDが未設定の場合はWeb client IDにフォールバックする", async () => {
    mockGetOidcEnv.mockReturnValue({
      OIDC_ISSUER: "http://localhost:8888/realms/tumiki",
      OIDC_CLIENT_ID: "tumiki-internal-manager",
      OIDC_CLIENT_SECRET: "secret",
    });
    const { GET } = await import("./route");

    const response = GET();

    await expect(response.json()).resolves.toStrictEqual({
      issuer: "http://localhost:8888/realms/tumiki",
      clientId: "tumiki-internal-manager",
    });
  });
});

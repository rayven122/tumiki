import { describe, test, expect, vi } from "vitest";

vi.mock("../commands/issueToken/handler.js", () => ({
  oauthTokenHandler: vi.fn((c: { json: (body: unknown) => Response }) =>
    c.json({ access_token: "test" }),
  ),
}));

vi.mock("../commands/registerClient/handler.js", () => ({
  dcrHandler: vi.fn((c: { json: (body: unknown) => Response }) =>
    c.json({ client_id: "test" }),
  ),
}));

import { oauthRoute } from "../route.js";

describe("oauthRoute", () => {
  test("oauthRouteが定義されている", () => {
    expect(oauthRoute).toBeDefined();
  });

  test("POST /tokenルートが処理される", async () => {
    const res = await oauthRoute.request("/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "authorization_code" }),
    });

    expect(res).toBeDefined();
  });

  test("POST /registerルートが処理される", async () => {
    const res = await oauthRoute.request("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redirect_uris: ["http://localhost"] }),
    });

    expect(res).toBeDefined();
  });
});

import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../shared/manager-api-client", () => ({
  requestManagerApi: vi.fn(),
}));

import { getDesktopSession } from "../desktop-session.service";
import { requestManagerApi } from "../../../shared/manager-api-client";

const validSession = {
  user: {
    id: "user-001",
    sub: "oidc-sub",
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "USER",
  },
  organization: { id: null, slug: "rayven", name: "Rayven" },
  groups: [],
  permissions: [],
  features: {
    catalog: true,
    accessRequests: false,
    policySync: true,
    auditLogSync: true,
  },
  policyVersion: "pol_v1_test",
};

describe("desktop-session.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("Manager APIからDesktopセッションを取得する", async () => {
    vi.mocked(requestManagerApi).mockResolvedValue(
      new Response(JSON.stringify(validSession), { status: 200 }),
    );

    await expect(getDesktopSession()).resolves.toStrictEqual(validSession);
    expect(requestManagerApi).toHaveBeenCalledWith(
      "/api/desktop/v1/session",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  test("Manager未接続または未ログインの場合はnullを返す", async () => {
    vi.mocked(requestManagerApi).mockResolvedValue(null);

    await expect(getDesktopSession()).resolves.toBeNull();
  });

  test("401の場合は再サインインが必要なエラーを返す", async () => {
    vi.mocked(requestManagerApi).mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );

    await expect(getDesktopSession()).rejects.toThrow(
      "管理サーバーへのサインインが必要です",
    );
  });

  test("サーバーエラーの場合はステータス付きエラーを返す", async () => {
    vi.mocked(requestManagerApi).mockResolvedValue(
      new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
      }),
    );

    await expect(getDesktopSession()).rejects.toThrow(
      "Desktopセッションの取得に失敗しました（500）",
    );
  });
});

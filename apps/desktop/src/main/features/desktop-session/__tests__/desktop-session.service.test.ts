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
  organization: {
    id: null,
    slug: null,
    name: "Rayven",
    logoUrl:
      "http://localhost:9000/tumiki-assets/org-assets/organization-logo.png",
  },
  groups: [],
  orgUnits: [
    {
      id: "org-unit-001",
      name: "Engineering",
      externalId: "eng",
      source: "google",
      path: "/Engineering",
      parentId: null,
      isPrimary: true,
      lastSyncedAt: "2026-05-04T00:00:00.000Z",
    },
  ],
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

  test("古いManager APIでlogoUrlが未返却でもnullとして扱う", async () => {
    vi.mocked(requestManagerApi).mockResolvedValue(
      new Response(
        JSON.stringify({
          ...validSession,
          organization: {
            ...validSession.organization,
            logoUrl: undefined,
          },
        }),
        { status: 200 },
      ),
    );

    await expect(getDesktopSession()).resolves.toStrictEqual({
      ...validSession,
      organization: {
        ...validSession.organization,
        logoUrl: null,
      },
    });
  });

  test("Manager APIでaccessRequestsが未返却でも無効として扱う", async () => {
    const features: Partial<typeof validSession.features> = {
      ...validSession.features,
    };
    delete features.accessRequests;
    vi.mocked(requestManagerApi).mockResolvedValue(
      new Response(
        JSON.stringify({
          ...validSession,
          features,
        }),
        { status: 200 },
      ),
    );

    await expect(getDesktopSession()).resolves.toStrictEqual({
      ...validSession,
      features: {
        ...features,
        accessRequests: false,
      },
    });
  });

  test("Manager未接続または未ログインの場合はエラーを返す", async () => {
    vi.mocked(requestManagerApi).mockRejectedValue(
      new Error("認証セッションがありません。再ログインしてください。"),
    );

    await expect(getDesktopSession()).rejects.toThrow(
      "認証セッションがありません。再ログインしてください。",
    );
  });

  test("401の場合は再ログインが必要なエラーを返す", async () => {
    vi.mocked(requestManagerApi).mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );

    await expect(getDesktopSession()).rejects.toThrow(
      "管理サーバーへの再ログインが必要です",
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

  test("応答フォーマットが不正な場合は利用者向けエラーを返す", async () => {
    vi.mocked(requestManagerApi).mockResolvedValue(
      new Response(JSON.stringify({ invalid: true }), { status: 200 }),
    );

    await expect(getDesktopSession()).rejects.toThrow(
      "管理サーバーからの応答フォーマットが不正です",
    );
  });
});

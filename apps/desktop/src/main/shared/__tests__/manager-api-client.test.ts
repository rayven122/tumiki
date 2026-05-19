import { beforeEach, describe, expect, test, vi } from "vitest";

const storeData = vi.hoisted(() => new Map<string, unknown>());

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));

vi.mock("../app-store", () => ({
  getAppStore: () =>
    Promise.resolve({
      get: (key: string) => storeData.get(key),
      set: (key: string, value: unknown) => storeData.set(key, value),
      delete: (key: string) => storeData.delete(key),
    }),
}));
vi.mock("../db");
vi.mock("../../utils/encryption");

import { postManagerApi, requestManagerApi } from "../manager-api-client";
import { getDb } from "../db";
import { decryptToken } from "../../utils/encryption";

describe("manager-api-client", () => {
  const mockFindFirst = vi.fn();
  const mockDeleteMany = vi.fn();
  const mockDb = {
    authToken: {
      findFirst: mockFindFirst,
      deleteMany: mockDeleteMany,
    },
  } as unknown as Awaited<ReturnType<typeof getDb>>;

  beforeEach(() => {
    storeData.clear();
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
    vi.mocked(decryptToken).mockResolvedValue("access-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("ok", { status: 200 })),
    );
  });

  test("Manager URLが未設定ならエラーにする", async () => {
    await expect(requestManagerApi("/api/example")).rejects.toThrow(
      "管理サーバーURLが設定されていません",
    );

    expect(fetch).not.toHaveBeenCalled();
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  test("有効な認証トークンでManager APIへJSONをPOSTする", async () => {
    storeData.set("managerUrl", "https://manager.example.com/");
    mockFindFirst.mockResolvedValue({
      id: 1,
      accessToken: "encrypted:access-token",
      refreshToken: null,
      idToken: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date("2026-05-03T09:00:00.000Z"),
      updatedAt: new Date("2026-05-03T09:00:00.000Z"),
    });

    const result = await postManagerApi("/api/internal/example", {
      hello: "world",
    });

    expect(result?.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "https://manager.example.com/api/internal/example",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ hello: "world" }),
      }),
    );
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer access-token",
    );
    expect(new Headers(init?.headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  test("idTokenが保存されている場合はManager APIのBearerにidTokenを使う", async () => {
    storeData.set("managerUrl", "https://manager.example.com/");
    mockFindFirst.mockResolvedValue({
      id: 1,
      accessToken: "encrypted:opaque-access-token",
      refreshToken: null,
      idToken: "encrypted:jwt-id-token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date("2026-05-03T09:00:00.000Z"),
      updatedAt: new Date("2026-05-03T09:00:00.000Z"),
    });
    vi.mocked(decryptToken).mockResolvedValue("jwt-id-token");

    const result = await requestManagerApi("/api/internal/example");

    expect(result?.ok).toBe(true);
    expect(decryptToken).toHaveBeenCalledWith("encrypted:jwt-id-token");
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer jwt-id-token",
    );
  });

  test("復号したBearerが空ならエラーにする", async () => {
    storeData.set("managerUrl", "https://manager.example.com");
    mockFindFirst.mockResolvedValue({
      id: 1,
      accessToken: "encrypted:empty-token",
      refreshToken: null,
      idToken: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(decryptToken).mockResolvedValue("");

    await expect(requestManagerApi("/api/example")).rejects.toThrow(
      "認証セッションがありません。再ログインしてください。",
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  test("Bearer候補がnullなら復号せずエラーにする", async () => {
    storeData.set("managerUrl", "https://manager.example.com");
    mockFindFirst.mockResolvedValue({
      id: 1,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(requestManagerApi("/api/example")).rejects.toThrow(
      "認証セッションがありません。再ログインしてください。",
    );

    expect(decryptToken).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  test("期限切れトークンは削除してエラーにする", async () => {
    storeData.set("managerUrl", "https://manager.example.com");
    mockFindFirst.mockResolvedValue({
      id: 1,
      accessToken: "encrypted:access-token",
      refreshToken: null,
      idToken: null,
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(requestManagerApi("/api/example")).rejects.toThrow(
      "認証セッションがありません。再ログインしてください。",
    );

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lte: expect.any(Date) } },
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

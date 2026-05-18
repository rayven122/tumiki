import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../db");
vi.mock("../../utils/encryption");

import {
  embedToolSearchTextsWithTumikiCloudApi,
  postTumikiCloudApi,
  requestTumikiCloudApi,
  TumikiCloudApiError,
} from "../tumiki-cloud-api-client";
import { getDb } from "../db";
import { decryptToken } from "../../utils/encryption";

describe("tumiki-cloud-api-client", () => {
  const mockFindFirst = vi.fn();
  const mockDeleteMany = vi.fn();
  const mockDb = {
    authToken: {
      findFirst: mockFindFirst,
      deleteMany: mockDeleteMany,
    },
  } as unknown as Awaited<ReturnType<typeof getDb>>;

  beforeEach(() => {
    vi.mocked(getDb).mockResolvedValue(mockDb);
    vi.mocked(decryptToken).mockResolvedValue("jwt-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("ok", { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("idTokenを優先してTumiki Cloud APIへJSONをPOSTする", async () => {
    mockFindFirst.mockResolvedValue({
      id: 1,
      accessToken: "encrypted:opaque-access-token",
      refreshToken: null,
      idToken: "encrypted:jwt-id-token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date("2026-05-18T09:00:00.000Z"),
      updatedAt: new Date("2026-05-18T09:00:00.000Z"),
    });
    vi.mocked(decryptToken).mockResolvedValue("jwt-id-token");

    const result = await postTumikiCloudApi("/v1/tool-search/embeddings", {
      texts: ["query"],
    });

    expect(result?.ok).toBe(true);
    expect(decryptToken).toHaveBeenCalledWith("encrypted:jwt-id-token");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.tumiki.cloud/v1/tool-search/embeddings",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ texts: ["query"] }),
      }),
    );
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer jwt-id-token",
    );
    expect(new Headers(init?.headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  test("TUMIKI_CLOUD_API_URLがあれば接続先を上書きする", async () => {
    vi.stubEnv("TUMIKI_CLOUD_API_URL", "https://stg-api.tumiki.cloud/");
    mockFindFirst.mockResolvedValue({
      id: 1,
      accessToken: "encrypted:access-token",
      refreshToken: null,
      idToken: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await requestTumikiCloudApi("v1/tool-search/embeddings");

    expect(fetch).toHaveBeenCalledWith(
      "https://stg-api.tumiki.cloud/v1/tool-search/embeddings",
      expect.any(Object),
    );
  });

  test("トークンがなければリクエストしない", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await requestTumikiCloudApi("/v1/tool-search/embeddings");

    expect(result).toBeNull();
    expect(mockFindFirst).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
    expect(mockDeleteMany).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  test("期限切れトークンは削除してリクエストしない", async () => {
    mockFindFirst.mockResolvedValue({
      id: 1,
      accessToken: "encrypted:access-token",
      refreshToken: null,
      idToken: "encrypted:id-token",
      expiresAt: new Date(Date.now() - 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await requestTumikiCloudApi("/v1/tool-search/embeddings");

    expect(result).toBeNull();
    expect(mockFindFirst).toHaveBeenCalledWith({
      orderBy: { createdAt: "desc" },
    });
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lte: expect.any(Date) } },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  test("復号結果が空ならリクエストしない", async () => {
    mockFindFirst.mockResolvedValue({
      id: 1,
      accessToken: "encrypted:access-token",
      refreshToken: null,
      idToken: "encrypted:id-token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(decryptToken).mockResolvedValue("");

    const result = await requestTumikiCloudApi("/v1/tool-search/embeddings");

    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  test("idTokenがnullの場合はaccessTokenをbearerとして使う", async () => {
    mockFindFirst.mockResolvedValue({
      id: 1,
      accessToken: "encrypted:access-token",
      refreshToken: null,
      idToken: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(decryptToken).mockResolvedValue("opaque-access-token");

    await requestTumikiCloudApi("/v1/tool-search/embeddings");

    expect(decryptToken).toHaveBeenCalledWith("encrypted:access-token");
    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer opaque-access-token",
    );
  });

  test("tool-search embeddings APIのレスポンスをnumber[][]で返す", async () => {
    mockFindFirst.mockResolvedValue({
      id: 1,
      accessToken: "encrypted:access-token",
      refreshToken: null,
      idToken: "encrypted:id-token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          model: "text-embedding-3-small",
          embeddings: [
            [0.1, 0.2],
            [0.3, 0.4],
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const embeddings = await embedToolSearchTextsWithTumikiCloudApi([
      "query",
      "tool text",
    ]);

    expect(embeddings).toStrictEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.tumiki.cloud/v1/tool-search/embeddings",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ texts: ["query", "tool text"] }),
      }),
    );
  });

  test("tool-search embeddings APIが失敗したらエラーを投げる", async () => {
    mockFindFirst.mockResolvedValue({
      id: 1,
      accessToken: "encrypted:access-token",
      refreshToken: null,
      idToken: "encrypted:id-token",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(fetch).mockResolvedValue(new Response("error", { status: 503 }));

    const promise = embedToolSearchTextsWithTumikiCloudApi(["query"]);
    await expect(promise).rejects.toThrow(
      "Tumiki Cloud API embedding failed: 503",
    );
    await expect(promise).rejects.toBeInstanceOf(TumikiCloudApiError);
    await expect(promise).rejects.toMatchObject({ status: 503 });
  });
});

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mockAuth = vi.hoisted(() => vi.fn());
const mockGetResolvedObjectStorageConfig = vi.hoisted(() => vi.fn());
const mockSend = vi.hoisted(() => vi.fn());

vi.mock("~/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@tumiki/internal-db/server", () => ({
  Role: {
    SYSTEM_ADMIN: "SYSTEM_ADMIN",
  },
}));

vi.mock("~/lib/object-storage/config", () => ({
  buildObjectUrl: (_config: unknown, objectKey: string) =>
    `http://localhost:9000/tumiki-assets/${objectKey}`,
  createObjectStorageClient: () => ({
    send: mockSend,
  }),
  getResolvedObjectStorageConfig: mockGetResolvedObjectStorageConfig,
}));

import { POST } from "./route";

const storageConfig = {
  source: "database",
  endpoint: "http://localhost:9000",
  region: "auto",
  bucket: "tumiki-assets",
  publicBaseUrl: "http://localhost:9000/tumiki-assets",
  accessKeyId: "minioadmin",
  secretAccessKey: "minioadmin",
  forcePathStyle: true,
};
const pngBytes = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
]);
const buildPngBlob = () => new Blob([pngBytes], { type: "image/png" });

const buildUploadRequest = (
  file: Blob,
  purpose: string | null = "org-logo",
) => {
  const formData = new FormData();
  formData.set("file", file, "logo.png");
  if (purpose !== null) {
    formData.set("purpose", purpose);
  }

  return new Request(
    "https://manager.example.com/api/admin/object-storage/upload",
    {
      method: "POST",
      body: formData,
    },
  );
};

describe("POST /api/admin/object-storage/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGetResolvedObjectStorageConfig.mockResolvedValue(storageConfig);
    mockAuth.mockResolvedValue({
      user: {
        sub: "admin-001",
        role: "SYSTEM_ADMIN",
      },
    });
    mockSend.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("未認証の場合は401を返す", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await POST(buildUploadRequest(buildPngBlob()));

    await expect(response.json()).resolves.toStrictEqual({
      error: "ログインが必要です",
    });
    expect(response.status).toStrictEqual(401);
    expect(mockGetResolvedObjectStorageConfig).not.toHaveBeenCalled();
  });

  test("SYSTEM_ADMIN以外の場合は403を返す", async () => {
    mockAuth.mockResolvedValue({
      user: {
        sub: "user-001",
        role: "USER",
      },
    });

    const response = await POST(buildUploadRequest(buildPngBlob()));

    await expect(response.json()).resolves.toStrictEqual({
      error: "SYSTEM_ADMINのみ操作できます",
    });
    expect(response.status).toStrictEqual(403);
    expect(mockGetResolvedObjectStorageConfig).not.toHaveBeenCalled();
  });

  test("ストレージ未設定の場合は設定を促すエラーを返す", async () => {
    mockGetResolvedObjectStorageConfig.mockResolvedValue(null);

    const response = await POST(buildUploadRequest(buildPngBlob()));

    await expect(response.json()).resolves.toStrictEqual({
      error:
        "画像アップロードにはS3互換ストレージ設定が必要です。先にオブジェクトストレージ設定を保存してください。",
    });
    expect(response.status).toStrictEqual(503);
    expect(mockSend).not.toHaveBeenCalled();
  });

  test("設定済みの場合はS3互換ストレージに画像を保存してURLを返す", async () => {
    const response = await POST(buildUploadRequest(buildPngBlob()));
    const body = (await response.json()) as {
      objectKey: string;
      source: string;
      url: string;
    };

    expect(response.status).toStrictEqual(200);
    expect(body.source).toStrictEqual("database");
    expect(body.objectKey).toMatch(/^org-assets\/org-logo-/);
    expect(body.url).toStrictEqual(
      `http://localhost:9000/tumiki-assets/${body.objectKey}`,
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  test("connector-icon用途ではconnector-assetsへ保存する", async () => {
    const response = await POST(
      buildUploadRequest(buildPngBlob(), "connector-icon"),
    );
    const body = (await response.json()) as { objectKey: string };

    expect(response.status).toStrictEqual(200);
    expect(body.objectKey).toMatch(/^connector-assets\/connector-icon-/);
  });

  test("用途未指定の場合はorg-logoとして保存する", async () => {
    const response = await POST(buildUploadRequest(buildPngBlob(), null));
    const body = (await response.json()) as { objectKey: string };

    expect(response.status).toStrictEqual(200);
    expect(body.objectKey).toMatch(/^org-assets\/org-logo-/);
  });

  test("画像サイズが上限を超える場合は400を返す", async () => {
    const response = await POST(
      buildUploadRequest(
        new Blob([new Uint8Array(512 * 1024 + 1)], { type: "image/png" }),
      ),
    );

    await expect(response.json()).resolves.toStrictEqual({
      error: "画像ファイルは512KB以下にしてください",
    });
    expect(response.status).toStrictEqual(400);
    expect(mockSend).not.toHaveBeenCalled();
  });

  test("許可されていないMIMEタイプの場合は400を返す", async () => {
    const response = await POST(
      buildUploadRequest(new Blob(["gif"], { type: "image/gif" })),
    );

    await expect(response.json()).resolves.toStrictEqual({
      error: "PNG / JPG / WebP の画像ファイルを選択してください",
    });
    expect(response.status).toStrictEqual(400);
    expect(mockSend).not.toHaveBeenCalled();
  });

  test("不正なアップロード用途の場合は400を返す", async () => {
    const response = await POST(
      buildUploadRequest(buildPngBlob(), "unexpected-purpose"),
    );

    await expect(response.json()).resolves.toStrictEqual({
      error: "アップロード用途が不正です",
    });
    expect(response.status).toStrictEqual(400);
    expect(mockSend).not.toHaveBeenCalled();
  });

  test("S3互換ストレージへの保存に失敗した場合は500を返す", async () => {
    mockSend.mockRejectedValue(new Error("S3 failed"));

    const response = await POST(buildUploadRequest(buildPngBlob()));

    await expect(response.json()).resolves.toStrictEqual({
      error: "画像ファイルの保存に失敗しました",
    });
    expect(response.status).toStrictEqual(500);
    expect(console.error).toHaveBeenCalledWith(
      "オブジェクトストレージへのアップロードに失敗しました:",
      expect.any(Error),
    );
  });
});

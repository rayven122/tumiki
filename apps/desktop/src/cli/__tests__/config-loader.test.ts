import { describe, test, expect, vi, beforeEach } from "vitest";

// モック
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

vi.mock("../decryptor", () => ({
  decryptCredentials: vi.fn(),
}));

import { getEnabledConfigs, getAvailableServerSlugs } from "../config-loader";
import { getDb } from "../db";
import { decryptCredentials } from "../decryptor";

const mockFindMany = vi.fn();
const mockDb = {
  mcpConnection: { findMany: mockFindMany },
  mcpServer: { findMany: vi.fn() },
} as unknown as ReturnType<typeof getDb>;

describe("getEnabledConfigs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockReturnValue(mockDb);
    vi.mocked(decryptCredentials).mockResolvedValue("{}");
  });

  test("STDIO接続のconfigを正しく生成する", async () => {
    mockFindMany.mockResolvedValue([
      {
        slug: "conn-1",
        transportType: "STDIO",
        command: "npx",
        args: '["-y", "some-package"]',
        credentials: "{}",
        server: { slug: "my-server", isEnabled: true },
      },
    ]);

    const configs = await getEnabledConfigs();

    expect(configs).toHaveLength(1);
    expect(configs[0]).toStrictEqual({
      name: "my-server-conn-1",
      command: "npx",
      args: ["-y", "some-package"],
      env: {},
    });
  });

  test("serverSlug指定でフィルタリングされる", async () => {
    mockFindMany.mockResolvedValue([]);

    await getEnabledConfigs("target-server");

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          server: expect.objectContaining({ slug: "target-server" }),
        }),
      }),
    );
  });

  test("serverSlug未指定では全サーバーが対象", async () => {
    mockFindMany.mockResolvedValue([]);

    await getEnabledConfigs();

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          server: expect.objectContaining({ isEnabled: true }),
        }),
      }),
    );
  });

  test("STDIO以外のトランスポートはスキップする", async () => {
    mockFindMany.mockResolvedValue([
      {
        slug: "sse-conn",
        transportType: "SSE",
        command: null,
        args: "[]",
        credentials: "{}",
        server: { slug: "sse-server", isEnabled: true },
      },
    ]);

    const configs = await getEnabledConfigs();
    expect(configs).toHaveLength(0);
  });

  test("commandがnullの接続はスキップする", async () => {
    mockFindMany.mockResolvedValue([
      {
        slug: "no-cmd",
        transportType: "STDIO",
        command: null,
        args: "[]",
        credentials: "{}",
        server: { slug: "server", isEnabled: true },
      },
    ]);

    const configs = await getEnabledConfigs();
    expect(configs).toHaveLength(0);
  });

  test("argsが不正なJSONの場合はスキップする", async () => {
    mockFindMany.mockResolvedValue([
      {
        slug: "bad-args",
        transportType: "STDIO",
        command: "npx",
        args: "not-json",
        credentials: "{}",
        server: { slug: "server", isEnabled: true },
      },
    ]);

    const configs = await getEnabledConfigs();
    expect(configs).toHaveLength(0);
  });

  test("復号に失敗した接続はスキップし他は処理を続行する", async () => {
    vi.mocked(decryptCredentials)
      .mockRejectedValueOnce(new Error("復号失敗"))
      .mockResolvedValueOnce("{}");

    mockFindMany.mockResolvedValue([
      {
        slug: "fail",
        transportType: "STDIO",
        command: "npx",
        args: '["pkg1"]',
        credentials: "encrypted",
        server: { slug: "server", isEnabled: true },
      },
      {
        slug: "ok",
        transportType: "STDIO",
        command: "npx",
        args: '["pkg2"]',
        credentials: "{}",
        server: { slug: "server", isEnabled: true },
      },
    ]);

    const configs = await getEnabledConfigs();
    expect(configs).toHaveLength(1);
    expect(configs[0]!.name).toBe("server-ok");
  });

  test("credentialsの復号結果をenvに展開する", async () => {
    vi.mocked(decryptCredentials).mockResolvedValue(
      '{"API_KEY": "sk-123", "SECRET": "abc"}',
    );

    mockFindMany.mockResolvedValue([
      {
        slug: "conn",
        transportType: "STDIO",
        command: "npx",
        args: '["pkg"]',
        credentials: "fallback:encrypted-data",
        server: { slug: "server", isEnabled: true },
      },
    ]);

    const configs = await getEnabledConfigs();
    expect(configs[0]!.env).toStrictEqual({
      API_KEY: "sk-123",
      SECRET: "abc",
    });
  });
});

describe("getAvailableServerSlugs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockReturnValue(mockDb);
  });

  test("有効なサーバーのslug一覧を返す", async () => {
    vi.mocked(mockDb.mcpServer.findMany).mockResolvedValue([
      { slug: "server-a" },
      { slug: "server-b" },
    ] as never);

    const slugs = await getAvailableServerSlugs();
    expect(slugs).toStrictEqual(["server-a", "server-b"]);
  });

  test("サーバーがない場合は空配列を返す", async () => {
    vi.mocked(mockDb.mcpServer.findMany).mockResolvedValue([] as never);

    const slugs = await getAvailableServerSlugs();
    expect(slugs).toStrictEqual([]);
  });
});

import { describe, test, expect, vi, beforeEach } from "vitest";

vi.mock("electron", () => ({
  app: {
    getPath: (name: string) =>
      name === "userData" ? "/test/user/data" : "/test",
  },
}));
vi.mock("../../../shared/db");
vi.mock("../../../shared/utils/logger");
vi.mock("../../../utils/encryption");

import {
  findByServerUrl,
  upsertOAuthClient,
  deleteByServerUrl,
  findManualClientByServerUrl,
} from "../oauth.repository";
import { encryptToken, decryptToken } from "../../../utils/encryption";

describe("oauth.repository", () => {
  const mockDb = {
    oAuthClient: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  } as unknown as Parameters<typeof findByServerUrl>[0];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(encryptToken).mockImplementation(async (v) => `encrypted:${v}`);
    vi.mocked(decryptToken).mockImplementation(async (v) =>
      v.replace("encrypted:", ""),
    );
  });

  describe("findByServerUrl", () => {
    test("レコードが存在する場合、復号化して返す", async () => {
      vi.mocked(mockDb.oAuthClient.findUnique).mockResolvedValueOnce({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "encrypted:client-id-123",
        clientSecret: "encrypted:client-secret-456",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: '{"issuer":"https://www.figma.com"}',
        isDcr: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await findByServerUrl(mockDb, "https://mcp.figma.com/mcp");

      expect(result).toStrictEqual({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "client-id-123",
        clientSecret: "client-secret-456",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: '{"issuer":"https://www.figma.com"}',
        isDcr: true,
      });
    });

    test("レコードが存在しない場合nullを返す", async () => {
      vi.mocked(mockDb.oAuthClient.findUnique).mockResolvedValueOnce(null);

      const result = await findByServerUrl(mockDb, "https://example.com");
      expect(result).toBeNull();
    });

    test("clientSecretがnullの場合そのまま返す", async () => {
      vi.mocked(mockDb.oAuthClient.findUnique).mockResolvedValueOnce({
        id: 1,
        serverUrl: "https://example.com",
        issuer: "https://example.com",
        clientId: "encrypted:public-client",
        clientSecret: null,
        tokenEndpointAuthMethod: "none",
        authServerMetadata: "{}",
        isDcr: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await findByServerUrl(mockDb, "https://example.com");
      expect(result?.clientSecret).toBeNull();
    });
  });

  describe("upsertOAuthClient", () => {
    test("暗号化してupsertする", async () => {
      await upsertOAuthClient(mockDb, {
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "my-client-id",
        clientSecret: "my-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: '{"issuer":"https://www.figma.com"}',
        isDcr: true,
      });

      expect(mockDb.oAuthClient.upsert).toHaveBeenCalledWith({
        where: { serverUrl: "https://mcp.figma.com/mcp" },
        create: expect.objectContaining({
          serverUrl: "https://mcp.figma.com/mcp",
          clientId: "encrypted:my-client-id",
          clientSecret: "encrypted:my-secret",
        }),
        update: expect.objectContaining({
          clientId: "encrypted:my-client-id",
          clientSecret: "encrypted:my-secret",
        }),
      });
    });

    test("clientSecretがnullの場合暗号化しない", async () => {
      await upsertOAuthClient(mockDb, {
        serverUrl: "https://example.com",
        issuer: "https://example.com",
        clientId: "public-client",
        clientSecret: null,
        tokenEndpointAuthMethod: "none",
        authServerMetadata: "{}",
        isDcr: true,
      });

      expect(mockDb.oAuthClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ clientSecret: null }),
          update: expect.objectContaining({ clientSecret: null }),
        }),
      );
    });
  });

  describe("deleteByServerUrl", () => {
    test("serverUrlで削除する", async () => {
      await deleteByServerUrl(mockDb, "https://mcp.figma.com/mcp");

      expect(mockDb.oAuthClient.deleteMany).toHaveBeenCalledWith({
        where: { serverUrl: "https://mcp.figma.com/mcp" },
      });
    });
  });

  describe("findManualClientByServerUrl", () => {
    test("isDcr=falseのレコードが存在する場合、復号化された値を返す", async () => {
      vi.mocked(mockDb.oAuthClient.findUnique).mockResolvedValueOnce({
        id: 1,
        serverUrl: "https://mcp.example.com",
        issuer: "https://example.com",
        clientId: "encrypted:manual-client-id",
        clientSecret: "encrypted:manual-client-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: "{}",
        isDcr: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await findManualClientByServerUrl(
        mockDb,
        "https://mcp.example.com",
      );

      expect(result).toStrictEqual({
        clientId: "manual-client-id",
        clientSecret: "manual-client-secret",
      });
    });

    test("isDcr=trueのレコード（DCR自動登録）はキャッシュ対象外としてnullを返す", async () => {
      vi.mocked(mockDb.oAuthClient.findUnique).mockResolvedValueOnce({
        id: 1,
        serverUrl: "https://mcp.figma.com/mcp",
        issuer: "https://www.figma.com",
        clientId: "encrypted:dcr-client-id",
        clientSecret: "encrypted:dcr-client-secret",
        tokenEndpointAuthMethod: "client_secret_post",
        authServerMetadata: "{}",
        isDcr: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await findManualClientByServerUrl(
        mockDb,
        "https://mcp.figma.com/mcp",
      );

      expect(result).toBeNull();
    });

    test("レコードが存在しない場合nullを返す", async () => {
      vi.mocked(mockDb.oAuthClient.findUnique).mockResolvedValueOnce(null);

      const result = await findManualClientByServerUrl(
        mockDb,
        "https://unknown.example.com",
      );

      expect(result).toBeNull();
    });

    test("isDcr=falseでclientSecretがnullの場合もnullのまま返す", async () => {
      vi.mocked(mockDb.oAuthClient.findUnique).mockResolvedValueOnce({
        id: 2,
        serverUrl: "https://mcp.public.example.com",
        issuer: "https://public.example.com",
        clientId: "encrypted:public-client",
        clientSecret: null,
        tokenEndpointAuthMethod: "none",
        authServerMetadata: "{}",
        isDcr: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await findManualClientByServerUrl(
        mockDb,
        "https://mcp.public.example.com",
      );

      expect(result).toStrictEqual({
        clientId: "public-client",
        clientSecret: null,
      });
    });
  });
});

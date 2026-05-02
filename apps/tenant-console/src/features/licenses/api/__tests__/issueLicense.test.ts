import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { type TRPCError } from "@trpc/server";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/env", () => ({
  env: {
    LICENSE_SIGNING_PRIVATE_KEY:
      "-----BEGIN PRIVATE KEY-----\nmock\n-----END PRIVATE KEY-----",
    TENANT_DATABASE_URL: "postgresql://test",
    INFISICAL_API_URL: "https://infisical.test",
    INFISICAL_ORG_ID: "org-id",
    INFISICAL_OPERATOR_CLIENT_ID: "client-id",
    INFISICAL_OPERATOR_CLIENT_SECRET: "client-secret",
    INFISICAL_OPERATOR_IDENTITY_ID: "identity-id",
  },
}));

const mockSign = vi.fn().mockResolvedValue("mock-jwt-token");

vi.mock("jose", () => ({
  importPKCS8: vi
    .fn()
    .mockResolvedValue({ type: "private" } as unknown as CryptoKey),
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setJti: vi.fn().mockReturnThis(),
    sign: mockSign,
  })),
}));

import { issueLicense, TOKEN_PREFIX } from "../issueLicense";
import type { Context } from "@/server/api/trpc";

const FIXED_NOW = new Date("2026-01-01T00:00:00.000Z");
const MOCK_LICENSE_ID = "clh1234567890abcdefghijk0";

const makeMockCtx = () => ({
  db: {
    tenant: { findUnique: vi.fn() },
    license: {
      create: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as Context["db"],
  headers: new Headers(),
});

describe("issueLicense", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("PERSONAL タイプ", () => {
    test("PERSONAL ライセンスを正常に発行できる", async () => {
      const ctx = makeMockCtx();
      const mockLicense = {
        id: MOCK_LICENSE_ID,
        type: "PERSONAL" as const,
        subject: "user@example.com",
        features: ["dynamic-search"],
        status: "ACTIVE" as const,
        jti: "some-uuid",
        issuedAt: FIXED_NOW,
        expiresAt: new Date(FIXED_NOW.getTime() + 30 * 86400 * 1000),
      };
      vi.mocked(ctx.db.license.create).mockResolvedValue(mockLicense as never);

      const result = await issueLicense(ctx, {
        type: "PERSONAL",
        subject: "user@example.com",
        features: ["dynamic-search"],
        ttlDays: 30,
      });

      expect(result.license).toStrictEqual(mockLicense);
      expect(result.token).toMatch(new RegExp(`^${TOKEN_PREFIX}`));
      expect(ctx.db.license.create).toHaveBeenCalledOnce();
    });
  });

  describe("TENANT タイプ", () => {
    test("TENANT タイプでテナントが見つからない場合 NOT_FOUND を返す", async () => {
      const ctx = makeMockCtx();
      vi.mocked(ctx.db.tenant.findUnique).mockResolvedValue(null);

      await expect(
        issueLicense(ctx, {
          type: "TENANT",
          subject: "clh1234567890abcdefghijk0",
          tenantId: "clh1234567890abcdefghijk0",
          features: ["dynamic-search"],
          ttlDays: 365,
        }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      } satisfies Partial<TRPCError>);

      expect(ctx.db.license.create).not.toHaveBeenCalled();
    });

    test("TENANT ライセンスを正常に発行できる", async () => {
      const ctx = makeMockCtx();
      vi.mocked(ctx.db.tenant.findUnique).mockResolvedValue({
        id: MOCK_LICENSE_ID,
      } as never);
      const mockLicense = {
        id: MOCK_LICENSE_ID,
        type: "TENANT" as const,
        subject: MOCK_LICENSE_ID,
        tenantId: MOCK_LICENSE_ID,
        features: ["dynamic-search"],
        status: "ACTIVE" as const,
      };
      vi.mocked(ctx.db.license.create).mockResolvedValue(mockLicense as never);

      const result = await issueLicense(ctx, {
        type: "TENANT",
        subject: MOCK_LICENSE_ID,
        tenantId: MOCK_LICENSE_ID,
        features: ["dynamic-search"],
        ttlDays: 365,
      });

      expect(result.token).toMatch(new RegExp(`^${TOKEN_PREFIX}`));
    });
  });

  describe("JWT 署名エラー処理", () => {
    test("JWT 署名失敗時にライセンスを REVOKED に倒す", async () => {
      const ctx = makeMockCtx();
      const mockLicense = { id: MOCK_LICENSE_ID };
      vi.mocked(ctx.db.license.create).mockResolvedValue(mockLicense as never);
      vi.mocked(ctx.db.license.update).mockResolvedValue({} as never);
      mockSign.mockRejectedValueOnce(new Error("署名失敗"));

      await expect(
        issueLicense(ctx, {
          type: "PERSONAL",
          subject: "user@example.com",
          features: ["dynamic-search"],
          ttlDays: 30,
        }),
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
      } satisfies Partial<TRPCError>);

      expect(ctx.db.license.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: MOCK_LICENSE_ID },
          data: expect.objectContaining({
            status: "REVOKED",
            revokedReason: "issue_failed",
          }),
        }),
      );
    });

    test("JWT 署名失敗かつロールバックも失敗した場合もエラーをスローする", async () => {
      const ctx = makeMockCtx();
      vi.mocked(ctx.db.license.create).mockResolvedValue({
        id: MOCK_LICENSE_ID,
      } as never);
      vi.mocked(ctx.db.license.update).mockRejectedValueOnce(
        new Error("DB 接続切断"),
      );
      mockSign.mockRejectedValueOnce(new Error("署名失敗"));
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);

      await expect(
        issueLicense(ctx, {
          type: "PERSONAL",
          subject: "user@example.com",
          features: ["dynamic-search"],
          ttlDays: 30,
        }),
      ).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
      } satisfies Partial<TRPCError>);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[issueLicense]"),
        expect.stringContaining(MOCK_LICENSE_ID),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });
});

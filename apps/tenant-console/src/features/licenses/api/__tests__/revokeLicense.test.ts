import { describe, expect, test, vi } from "vitest";
import { type TRPCError } from "@trpc/server";
import type { Context } from "@/server/api/trpc";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ db: {} }));

// vi.mock はホイストされるため、vi.hoisted でクラスを先に定義する
const { PrismaClientKnownRequestError } = vi.hoisted(() => {
  class PrismaKnownError extends Error {
    code: string;
    constructor(
      message: string,
      { code }: { code: string; clientVersion: string },
    ) {
      super(message);
      this.code = code;
      this.name = "PrismaClientKnownRequestError";
    }
  }
  return { PrismaClientKnownRequestError: PrismaKnownError };
});

vi.mock("@db-client", () => ({
  Prisma: { PrismaClientKnownRequestError },
}));

import { revokeLicense } from "../revokeLicense";

const MOCK_ID = "clh1234567890abcdefghijk0";

const makeMockCtx = () => ({
  db: {
    license: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
  } as unknown as Context["db"],
  headers: new Headers(),
});

describe("revokeLicense", () => {
  test("ACTIVE ライセンスを REVOKED に更新して computedStatus を付与する", async () => {
    const ctx = makeMockCtx();
    const now = new Date();
    vi.mocked(ctx.db.license.update).mockResolvedValue({
      id: MOCK_ID,
      status: "REVOKED" as const,
      revokedAt: now,
      revokedReason: "手動失効",
      expiresAt: new Date(Date.now() + 86400 * 1000),
    } as never);

    const result = await revokeLicense(ctx, {
      id: MOCK_ID,
      reason: "手動失効",
    });

    expect(result.status).toStrictEqual("REVOKED");
    expect(result.computedStatus).toStrictEqual("REVOKED");
    expect(ctx.db.license.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: MOCK_ID, status: "ACTIVE" },
        data: expect.objectContaining({ status: "REVOKED" }),
      }),
    );
  });

  test("存在しない ID に NOT_FOUND を返す", async () => {
    const ctx = makeMockCtx();
    const p2025 = new PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "5.0.0",
    });
    vi.mocked(ctx.db.license.update).mockRejectedValueOnce(p2025);
    vi.mocked(ctx.db.license.findUnique).mockResolvedValue(null);

    await expect(revokeLicense(ctx, { id: MOCK_ID })).rejects.toMatchObject({
      code: "NOT_FOUND",
    } satisfies Partial<TRPCError>);
  });

  test("REVOKED 済みライセンスに CONFLICT を返す", async () => {
    const ctx = makeMockCtx();
    const p2025 = new PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "5.0.0",
    });
    vi.mocked(ctx.db.license.update).mockRejectedValueOnce(p2025);
    vi.mocked(ctx.db.license.findUnique).mockResolvedValue({
      id: MOCK_ID,
      status: "REVOKED" as const,
    } as never);

    await expect(revokeLicense(ctx, { id: MOCK_ID })).rejects.toMatchObject({
      code: "CONFLICT",
    } satisfies Partial<TRPCError>);
  });

  test("P2025 以外の DB エラーはそのまま再スローする", async () => {
    const ctx = makeMockCtx();
    const unexpectedError = new PrismaClientKnownRequestError(
      "Unique constraint",
      {
        code: "P2002",
        clientVersion: "5.0.0",
      },
    );
    vi.mocked(ctx.db.license.update).mockRejectedValueOnce(unexpectedError);

    await expect(revokeLicense(ctx, { id: MOCK_ID })).rejects.toThrow(
      unexpectedError,
    );
  });
});

import { describe, expect, test, vi } from "vitest";
import { type TRPCError } from "@trpc/server";
import type { Context } from "@/server/api/trpc";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ db: {} }));

import { getLicense } from "../getLicense";

const MOCK_ID = "clh1234567890abcdefghijk0";

const makeMockCtx = () => ({
  db: {
    license: {
      findUnique: vi.fn(),
    },
  } as unknown as Context["db"],
  headers: new Headers(),
});

describe("getLicense", () => {
  test("ライセンスが存在する場合に computedStatus を付与して返す", async () => {
    const ctx = makeMockCtx();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 86400 * 1000);
    vi.mocked(ctx.db.license.findUnique).mockResolvedValue({
      id: MOCK_ID,
      status: "ACTIVE" as const,
      expiresAt,
      revokedAt: null,
      revokedReason: null,
    } as never);

    const result = await getLicense(ctx, { id: MOCK_ID });

    expect(result.id).toStrictEqual(MOCK_ID);
    expect(result.status).toStrictEqual("ACTIVE");
    expect(result.computedStatus).toStrictEqual("ACTIVE");
    expect(ctx.db.license.findUnique).toHaveBeenCalledWith({
      where: { id: MOCK_ID },
    });
  });

  test("期限切れライセンスは computedStatus が EXPIRED になる", async () => {
    const ctx = makeMockCtx();
    const expiresAt = new Date(Date.now() - 1000);
    vi.mocked(ctx.db.license.findUnique).mockResolvedValue({
      id: MOCK_ID,
      status: "ACTIVE" as const,
      expiresAt,
      revokedAt: null,
      revokedReason: null,
    } as never);

    const result = await getLicense(ctx, { id: MOCK_ID });

    expect(result.status).toStrictEqual("ACTIVE");
    expect(result.computedStatus).toStrictEqual("EXPIRED");
  });

  test("REVOKED ライセンスは computedStatus が REVOKED になる", async () => {
    const ctx = makeMockCtx();
    const expiresAt = new Date(Date.now() + 86400 * 1000);
    vi.mocked(ctx.db.license.findUnique).mockResolvedValue({
      id: MOCK_ID,
      status: "REVOKED" as const,
      expiresAt,
      revokedAt: new Date(),
      revokedReason: "テスト失効",
    } as never);

    const result = await getLicense(ctx, { id: MOCK_ID });

    expect(result.computedStatus).toStrictEqual("REVOKED");
  });

  test("存在しない ID に NOT_FOUND を返す", async () => {
    const ctx = makeMockCtx();
    vi.mocked(ctx.db.license.findUnique).mockResolvedValue(null);

    await expect(getLicense(ctx, { id: MOCK_ID })).rejects.toMatchObject({
      code: "NOT_FOUND",
    } satisfies Partial<TRPCError>);
  });
});

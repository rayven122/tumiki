import { describe, expect, test, vi } from "vitest";
import type { Context } from "@/server/api/trpc";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ db: {} }));

import { listLicenses } from "../listLicenses";

const MOCK_ID_1 = "clh1234567890abcdefghijk1";
const MOCK_ID_2 = "clh1234567890abcdefghijk2";
const MOCK_ID_3 = "clh1234567890abcdefghijk3";

const makeMockCtx = () => ({
  db: {
    license: {
      findMany: vi.fn(),
    },
  } as unknown as Context["db"],
  headers: new Headers(),
});

const futureDate = new Date(Date.now() + 86400 * 1000);
const pastDate = new Date(Date.now() - 86400 * 1000);

const makeActiveLicense = (id: string) => ({
  id,
  status: "ACTIVE" as const,
  expiresAt: futureDate,
  revokedAt: null,
  revokedReason: null,
  createdAt: new Date(),
  type: "PERSONAL" as const,
  subject: "user@example.com",
  tenantId: null,
  features: ["dynamic-search"],
  plan: null,
  jti: `jti-${id}`,
  issuedAt: new Date(),
  notes: null,
  issuedByEmail: null,
  updatedAt: new Date(),
});

describe("listLicenses", () => {
  test("フィルターなしで全件返す", async () => {
    const ctx = makeMockCtx();
    vi.mocked(ctx.db.license.findMany).mockResolvedValue([
      makeActiveLicense(MOCK_ID_1),
      makeActiveLicense(MOCK_ID_2),
    ] as never);

    const result = await listLicenses(ctx, { limit: 20 });

    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toStrictEqual(false);
    expect(result.nextCursor).toBeUndefined();
    expect(result.items[0]?.computedStatus).toStrictEqual("ACTIVE");
  });

  test("limit+1 件返ってきた場合 hasMore=true で nextCursor を設定する", async () => {
    const ctx = makeMockCtx();
    vi.mocked(ctx.db.license.findMany).mockResolvedValue([
      makeActiveLicense(MOCK_ID_1),
      makeActiveLicense(MOCK_ID_2),
      makeActiveLicense(MOCK_ID_3),
    ] as never);

    const result = await listLicenses(ctx, { limit: 2 });

    expect(result.items).toHaveLength(2);
    expect(result.hasMore).toStrictEqual(true);
    expect(result.nextCursor).toStrictEqual(MOCK_ID_2);
  });

  test("status=ACTIVE フィルターで expiresAt gte 条件を渡す", async () => {
    const ctx = makeMockCtx();
    vi.mocked(ctx.db.license.findMany).mockResolvedValue([] as never);

    await listLicenses(ctx, { status: "ACTIVE", limit: 20 });

    expect(ctx.db.license.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACTIVE",
          expiresAt: expect.objectContaining({ gte: expect.any(Date) }),
        }),
      }),
    );
  });

  test("status=REVOKED フィルターで status=REVOKED 条件を渡す", async () => {
    const ctx = makeMockCtx();
    vi.mocked(ctx.db.license.findMany).mockResolvedValue([] as never);

    await listLicenses(ctx, { status: "REVOKED", limit: 20 });

    expect(ctx.db.license.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "REVOKED" }),
      }),
    );
  });

  test("status=EXPIRED フィルターで status=ACTIVE かつ expiresAt lt 条件を渡す", async () => {
    const ctx = makeMockCtx();
    vi.mocked(ctx.db.license.findMany).mockResolvedValue([] as never);

    await listLicenses(ctx, { status: "EXPIRED", limit: 20 });

    expect(ctx.db.license.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACTIVE",
          expiresAt: expect.objectContaining({ lt: expect.any(Date) }),
        }),
      }),
    );
  });

  test("type フィルターを渡すと where に type が含まれる", async () => {
    const ctx = makeMockCtx();
    vi.mocked(ctx.db.license.findMany).mockResolvedValue([] as never);

    await listLicenses(ctx, { type: "PERSONAL", limit: 20 });

    expect(ctx.db.license.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: "PERSONAL" }),
      }),
    );
  });

  test("cursor 指定時は skip=1 で cursor を渡す", async () => {
    const ctx = makeMockCtx();
    vi.mocked(ctx.db.license.findMany).mockResolvedValue([] as never);

    await listLicenses(ctx, { cursor: MOCK_ID_1, limit: 20 });

    expect(ctx.db.license.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: MOCK_ID_1 },
        skip: 1,
      }),
    );
  });

  test("期限切れ ACTIVE アイテムの computedStatus は EXPIRED になる", async () => {
    const ctx = makeMockCtx();
    vi.mocked(ctx.db.license.findMany).mockResolvedValue([
      { ...makeActiveLicense(MOCK_ID_1), expiresAt: pastDate },
    ] as never);

    const result = await listLicenses(ctx, { limit: 20 });

    expect(result.items[0]?.computedStatus).toStrictEqual("EXPIRED");
  });

  test("search フィルターで OR 条件（subject/notes）を渡す", async () => {
    const ctx = makeMockCtx();
    vi.mocked(ctx.db.license.findMany).mockResolvedValue([] as never);

    await listLicenses(ctx, { search: "keyword", limit: 20 });

    expect(ctx.db.license.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              subject: expect.objectContaining({ contains: "keyword" }),
            }),
          ]),
        }),
      }),
    );
  });
});

import { describe, expect, test, vi } from "vitest";
import { type TRPCError } from "@trpc/server";
import type { Context } from "@/server/api/trpc";

vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("../createTenant", () => ({ createTenant: vi.fn() }));
vi.mock("../deleteTenant", () => ({ deleteTenant: vi.fn() }));

import { tenantRouter } from "../router";

const MOCK_ID = "clh1234567890abcdefghijk0";

const makeMockCtx = () => ({
  db: {
    tenant: {
      findUnique: vi.fn(),
    },
  } as unknown as Context["db"],
  headers: new Headers(),
});

const caller = (ctx: ReturnType<typeof makeMockCtx>) =>
  tenantRouter.createCaller(ctx as unknown as Context);

describe("tenant.get", () => {
  test("テナントが存在する場合に返す", async () => {
    const ctx = makeMockCtx();
    const tenant = {
      id: MOCK_ID,
      slug: "test-tenant",
      domain: "test.example.com",
      status: "ACTIVE" as const,
      oidcType: "CUSTOM" as const,
      createdAt: new Date("2024-01-01"),
    };
    vi.mocked(ctx.db.tenant.findUnique).mockResolvedValue(tenant as never);

    const result = await caller(ctx).get({ id: MOCK_ID });

    expect(result).toStrictEqual(tenant);
    expect(ctx.db.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: MOCK_ID },
      select: {
        id: true,
        slug: true,
        domain: true,
        status: true,
        oidcType: true,
        createdAt: true,
      },
    });
  });

  test("存在しない ID に NOT_FOUND を返す", async () => {
    const ctx = makeMockCtx();
    vi.mocked(ctx.db.tenant.findUnique).mockResolvedValue(null);

    await expect(caller(ctx).get({ id: MOCK_ID })).rejects.toMatchObject({
      code: "NOT_FOUND",
    } satisfies Partial<TRPCError>);
  });
});

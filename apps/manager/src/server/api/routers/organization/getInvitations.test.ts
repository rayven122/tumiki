import { describe, test, expect, beforeEach, vi } from "vitest";
import { getInvitations } from "./getInvitations";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import { type OrganizationId } from "@/schema/ids";

const mockOrganizationId = "cm123456789abcdefghij" as OrganizationId;
const mockUserId = "user_test456";

describe("getInvitations（CE版）", () => {
  let mockCtx: ProtectedContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCtx = {
      db: {} as ProtectedContext["db"],
      session: {
        user: {
          id: mockUserId,
          email: "test@example.com",
          organizationId: mockOrganizationId,
          organizationSlug: "test-org",
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as unknown as ProtectedContext["session"],
      currentOrg: {
        id: mockOrganizationId,
        createdBy: mockUserId,
        isPersonal: false,
        members: [
          {
            id: "member_test123",
            userId: mockUserId,
          },
        ],
      },
      headers: new Headers(),
    } as unknown as ProtectedContext;
  });

  test("CE版ではFORBIDDENエラーを返す", async () => {
    await expect(
      getInvitations({
        ctx: mockCtx,
      }),
    ).rejects.toThrow(TRPCError);

    await expect(
      getInvitations({
        ctx: mockCtx,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "招待一覧取得機能はEnterprise Editionでのみ利用可能です",
    });
  });
});

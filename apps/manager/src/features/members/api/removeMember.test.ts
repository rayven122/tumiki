import { describe, test, expect, beforeEach, vi } from "vitest";
import { removeMember } from "./removeMember";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import { type OrganizationId, type OrganizationMemberId } from "@/schema/ids";

const mockOrganizationId = "org_test123" as OrganizationId;
const mockUserId = "user_test456";
const mockMemberId = "member_target123" as OrganizationMemberId;

describe("removeMember（CE版）", () => {
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
        slug: "test-org",
        createdBy: mockUserId,
        isPersonal: false,
        roles: ["Admin"],
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
      removeMember({
        input: {
          memberId: mockMemberId,
        },
        ctx: mockCtx,
      }),
    ).rejects.toThrow(TRPCError);

    await expect(
      removeMember({
        input: {
          memberId: mockMemberId,
        },
        ctx: mockCtx,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "メンバー削除機能はEnterprise Editionでのみ利用可能です",
    });
  });
});

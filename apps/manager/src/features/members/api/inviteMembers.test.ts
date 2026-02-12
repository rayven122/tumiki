import { describe, test, expect, beforeEach, vi } from "vitest";
import { inviteMembers } from "./inviteMembers";
import { TRPCError } from "@trpc/server";
import type { ProtectedContext } from "@/server/api/trpc";
import { type OrganizationId } from "@/schema/ids";

const mockOrganizationId = "org_test123" as OrganizationId;
const mockUserId = "user_test456";

describe("inviteMembers（CE版）", () => {
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
      inviteMembers({
        input: {
          emails: ["newmember@example.com"],
          roles: ["Member"],
        },
        ctx: mockCtx,
      }),
    ).rejects.toThrow(TRPCError);

    await expect(
      inviteMembers({
        input: {
          emails: ["newmember@example.com"],
          roles: ["Member"],
        },
        ctx: mockCtx,
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "メンバー招待機能はEnterprise Editionでのみ利用可能です",
    });
  });
});

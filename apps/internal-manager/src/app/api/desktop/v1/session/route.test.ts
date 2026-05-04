import { createHash } from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { NextRequest } from "next/server";
import { ApprovalStatus, GroupSource, Role } from "@tumiki/internal-db";

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockVerifyDesktopJwt = vi.hoisted(() => vi.fn());

vi.mock("@tumiki/internal-db/server", () => ({
  db: {
    user: {
      findUnique: mockFindUnique,
    },
  },
}));

vi.mock("~/lib/auth/verify-desktop-jwt", () => ({
  verifyDesktopJwt: mockVerifyDesktopJwt,
}));

import { GET } from "./route";

const buildRequest = () =>
  new Request("https://manager.example.com/api/desktop/v1/session", {
    method: "GET",
    headers: {
      Authorization: "Bearer access-token",
    },
  }) as NextRequest;

type FindUniqueArgs = {
  where: { id: string };
  select: {
    id: true;
    groupMemberships: unknown;
    individualPermissions: {
      where: {
        status: ApprovalStatus;
        OR: [{ expiresAt: null }, { expiresAt: { gt: Date } }];
      };
    };
  };
};

const userUpdatedAt = new Date("2026-05-03T10:00:00.000Z");
const groupUpdatedAt = new Date("2026-05-03T10:05:00.000Z");
const membershipCreatedAt = new Date("2026-05-03T10:01:00.000Z");
const activeUser = {
  id: "user-001",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: Role.USER,
  isActive: true,
  updatedAt: userUpdatedAt,
  groupMemberships: [
    {
      source: GroupSource.IDP,
      createdAt: membershipCreatedAt,
      group: {
        id: "group-001",
        name: "Engineering",
        description: "Product engineering",
        source: GroupSource.IDP,
        provider: "keycloak",
        externalId: "engineering",
        lastSyncedAt: new Date("2026-05-03T09:00:00.000Z"),
        updatedAt: groupUpdatedAt,
        permissions: [
          {
            mcpServerId: "github",
            read: true,
            write: false,
            execute: true,
          },
        ],
      },
    },
  ],
  individualPermissions: [
    {
      mcpServerId: "slack",
      reason: "Temporary support",
      approvedAt: new Date("2026-05-03T09:30:00.000Z"),
      expiresAt: null,
      updatedAt: new Date("2026-05-03T10:10:00.000Z"),
    },
  ],
};

const expectedGroups = [
  {
    id: "group-001",
    name: "Engineering",
    description: "Product engineering",
    source: GroupSource.IDP,
    provider: "keycloak",
    externalId: "engineering",
    membershipSource: GroupSource.IDP,
    lastSyncedAt: "2026-05-03T09:00:00.000Z",
  },
];

const expectedPermissions = [
  {
    source: "GROUP",
    groupId: "group-001",
    mcpServerId: "github",
    read: true,
    write: false,
    execute: true,
  },
  {
    source: "INDIVIDUAL",
    mcpServerId: "slack",
    read: true,
    write: true,
    execute: true,
    reason: "Temporary support",
    approvedAt: "2026-05-03T09:30:00.000Z",
    expiresAt: null,
  },
] as const;

const expectedPolicyVersion = `pol_v1_${createHash("sha256")
  .update(
    JSON.stringify({
      user: {
        id: "user-001",
        role: Role.USER,
        updatedAt: userUpdatedAt.toISOString(),
      },
      groups: expectedGroups,
      permissions: expectedPermissions,
    }),
  )
  .digest("base64url")
  .slice(0, 32)}`;

describe("GET /api/desktop/v1/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyDesktopJwt.mockResolvedValue({
      sub: "oidc-sub-001",
      userId: "user-001",
    });
    mockFindUnique.mockResolvedValue(activeUser);
  });

  test("Desktopセッション情報を認証ユーザーに紐づけて返す", async () => {
    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      user: {
        id: "user-001",
        sub: "oidc-sub-001",
        name: "Ada Lovelace",
        email: "ada@example.com",
        role: Role.USER,
      },
      organization: {
        id: null,
        slug: null,
        name: null,
      },
      groups: expectedGroups,
      permissions: expectedPermissions,
      features: {
        catalog: false,
        accessRequests: false,
        policySync: false,
        auditLogSync: true,
      },
      policyVersion: expectedPolicyVersion,
    });
    expect(response.status).toStrictEqual(200);
    expect(mockVerifyDesktopJwt).toHaveBeenCalledWith("Bearer access-token");
    const findUniqueArgs = (
      mockFindUnique.mock.calls as [FindUniqueArgs][]
    )[0]?.[0];
    expect(findUniqueArgs?.where).toStrictEqual({ id: "user-001" });
    expect(findUniqueArgs?.select.id).toStrictEqual(true);
    expect(findUniqueArgs?.select.groupMemberships).toBeDefined();
    expect(
      findUniqueArgs?.select.individualPermissions.where.status,
    ).toStrictEqual(ApprovalStatus.APPROVED);
    expect(
      findUniqueArgs?.select.individualPermissions.where.OR[0],
    ).toStrictEqual({ expiresAt: null });
    expect(
      findUniqueArgs?.select.individualPermissions.where.OR[1].expiresAt.gt,
    ).toBeInstanceOf(Date);
  });

  test("認証に失敗した場合は401を返す", async () => {
    mockVerifyDesktopJwt.mockRejectedValue(new Error("Unauthorized"));

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Unauthorized",
    });
    expect(response.status).toStrictEqual(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  test("ユーザーが存在しない場合は401を返す", async () => {
    mockFindUnique.mockResolvedValue(null);

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Unauthorized",
    });
    expect(response.status).toStrictEqual(401);
  });

  test("無効化されたユーザーは401を返す", async () => {
    mockFindUnique.mockResolvedValue({ ...activeUser, isActive: false });

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Unauthorized",
    });
    expect(response.status).toStrictEqual(401);
  });
});

import { createHash } from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { NextRequest } from "next/server";
import { ApprovalStatus, GroupSource, Role } from "@tumiki/internal-db";

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockMcpCatalogFindMany = vi.hoisted(() => vi.fn());
const mockFindSettings = vi.hoisted(() => vi.fn());
const mockVerifyDesktopJwt = vi.hoisted(() => vi.fn());

vi.mock("@tumiki/internal-db/server", () => ({
  db: {
    user: {
      findUnique: mockFindUnique,
    },
    mcpCatalog: {
      findMany: mockMcpCatalogFindMany,
    },
    desktopApiSettings: {
      findUnique: mockFindSettings,
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
const orgUnitUpdatedAt = new Date("2026-05-03T10:06:00.000Z");
const catalogUpdatedAt = new Date("2026-05-03T10:07:00.000Z");
const toolUpdatedAt = new Date("2026-05-03T10:08:00.000Z");
const orgUnitPermissionUpdatedAt = new Date("2026-05-03T10:09:00.000Z");
const membershipCreatedAt = new Date("2026-05-03T10:01:00.000Z");
const membershipUpdatedAt = new Date("2026-05-03T10:02:00.000Z");
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
  orgUnitMemberships: [
    {
      isPrimary: true,
      updatedAt: membershipUpdatedAt,
      orgUnit: {
        id: "org-001",
        name: "Product Engineering",
        externalId: "department:product-engineering",
        source: "SCIM",
        path: "/department:product-engineering",
        parentId: null,
        lastSyncedAt: new Date("2026-05-03T09:10:00.000Z"),
        updatedAt: orgUnitUpdatedAt,
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

const expectedOrgUnits = [
  {
    id: "org-001",
    name: "Product Engineering",
    externalId: "department:product-engineering",
    source: "SCIM",
    path: "/department:product-engineering",
    parentId: null,
    isPrimary: true,
    lastSyncedAt: "2026-05-03T09:10:00.000Z",
  },
];

const expectedPolicyCatalogs = [
  {
    id: "catalog-001",
    slug: "github",
    status: "ACTIVE",
    updatedAt: catalogUpdatedAt,
    tools: [
      {
        id: "tool-001",
        name: "search_repositories",
        defaultAllowed: false,
        updatedAt: toolUpdatedAt,
        orgUnitPermissions: [
          {
            orgUnitId: "org-001",
            effect: "ALLOW",
            updatedAt: orgUnitPermissionUpdatedAt,
          },
        ],
      },
    ],
  },
];

const expectedPolicyVersion = `pol_v1_${createHash("sha256")
  .update(
    JSON.stringify({
      user: {
        id: "user-001",
        role: Role.USER,
        updatedAt: userUpdatedAt.toISOString(),
      },
      settings: {
        organizationName: "Rayven",
        organizationLogoUrl:
          "http://localhost:9000/tumiki-assets/org-assets/organization-logo.png",
      },
      groups: expectedGroups,
      orgUnits: expectedOrgUnits,
      catalogs: expectedPolicyCatalogs,
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
    mockMcpCatalogFindMany.mockResolvedValue(expectedPolicyCatalogs);
    mockFindSettings.mockResolvedValue({
      organizationName: "Rayven",
      organizationLogoUrl:
        "http://localhost:9000/tumiki-assets/org-assets/organization-logo.png",
    });
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
        name: "Rayven",
        logoUrl:
          "http://localhost:9000/tumiki-assets/org-assets/organization-logo.png",
      },
      groups: expectedGroups,
      orgUnits: expectedOrgUnits,
      permissions: expectedPermissions,
      features: {
        catalog: true,
        accessRequests: true,
        policySync: true,
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
    expect(mockFindSettings).toHaveBeenCalledWith({
      where: { id: "default" },
      select: {
        organizationName: true,
        organizationLogoUrl: true,
      },
    });
  });

  test("Desktop API設定が未作成の場合はデフォルト値を返す", async () => {
    mockFindSettings.mockResolvedValue(null);

    const response = await GET(buildRequest());
    const body = (await response.json()) as {
      organization: {
        name: string | null;
        slug: string | null;
        logoUrl: string | null;
      };
      features: Record<string, boolean>;
    };

    expect(response.status).toStrictEqual(200);
    expect(body.organization).toStrictEqual({
      id: null,
      name: null,
      slug: null,
      logoUrl: null,
    });
    expect(body.features).toStrictEqual({
      catalog: true,
      accessRequests: true,
      policySync: true,
      auditLogSync: true,
    });
  });

  test("認証に失敗した場合は401を返す", async () => {
    mockVerifyDesktopJwt.mockRejectedValue(new Error("Unauthorized"));

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Unauthorized",
    });
    expect(response.status).toStrictEqual(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockMcpCatalogFindMany).not.toHaveBeenCalled();
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

  test("DBエラー時はJSONの500レスポンスを返す", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockFindUnique.mockRejectedValue(new Error("DB error"));

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Internal Server Error",
    });
    expect(response.status).toStrictEqual(500);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to fetch desktop session",
      expect.any(Error),
    );
    consoleErrorSpy.mockRestore();
  });
});

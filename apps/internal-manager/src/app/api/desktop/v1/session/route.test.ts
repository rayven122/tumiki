import { createHash } from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { NextRequest } from "next/server";
import { GroupSource, PolicyEffect, Role } from "@tumiki/internal-db";

const mockFindUnique = vi.hoisted(() => vi.fn());
const mockOrgUnitFindMany = vi.hoisted(() => vi.fn());
const mockMcpCatalogFindMany = vi.hoisted(() => vi.fn());
const mockFindSettings = vi.hoisted(() => vi.fn());
const mockVerifyDesktopJwt = vi.hoisted(() => vi.fn());

vi.mock("@tumiki/internal-db/server", () => ({
  db: {
    user: {
      findUnique: mockFindUnique,
    },
    orgUnit: {
      findMany: mockOrgUnitFindMany,
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
    groupMemberships: {
      select: {
        group: {
          select: Record<string, unknown>;
        };
      };
    };
  };
};

type FindPolicyCatalogsArgs = {
  take: number;
  select: {
    orgUnitCatalogPermissions: {
      where: { orgUnitId: { in: string[] } };
      orderBy: [{ orgUnitId: "asc" }];
    };
    groupCatalogPermissions: {
      where: { groupId: { in: string[] } };
      orderBy: [{ groupId: "asc" }];
    };
    userCatalogPermissions: {
      where: {
        userId: string;
        OR: [{ expiresAt: null }, { expiresAt: { gt: Date } }];
      };
      orderBy: [{ id: "asc" }];
    };
    tools: {
      take: number;
      select: {
        groupPermissions: {
          where: { groupId: { in: string[] } };
          orderBy: [{ groupId: "asc" }];
        };
        orgUnitPermissions: {
          where: { orgUnitId: { in: string[] } };
          orderBy: [{ orgUnitId: "asc" }];
        };
        userPermissions: {
          where: {
            userId: string;
            OR: [{ expiresAt: null }, { expiresAt: { gt: Date } }];
          };
          orderBy: [{ id: "asc" }];
        };
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
    source: "ORG_UNIT",
    scope: "TOOL",
    orgUnitId: "org-001",
    catalogId: "catalog-001",
    toolId: "tool-001",
    effect: PolicyEffect.ALLOW,
  },
  {
    source: "GROUP",
    scope: "CATALOG",
    groupId: "group-001",
    catalogId: "catalog-001",
    effect: PolicyEffect.ALLOW,
  },
  {
    source: "USER",
    scope: "CATALOG",
    catalogId: "catalog-001",
    effect: PolicyEffect.ALLOW,
    reason: "Temporary support",
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
    orgUnitCatalogPermissions: [],
    groupCatalogPermissions: [
      {
        groupId: "group-001",
        effect: PolicyEffect.ALLOW,
        updatedAt: new Date("2026-05-03T09:20:00.000Z"),
      },
    ],
    userCatalogPermissions: [
      {
        userId: "user-001",
        effect: PolicyEffect.ALLOW,
        reason: "Temporary support",
        expiresAt: null,
        updatedAt: new Date("2026-05-03T10:10:00.000Z"),
      },
    ],
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
        groupPermissions: [],
        userPermissions: [],
      },
    ],
  },
];
const expectedPolicyCatalogsForVersion = JSON.parse(
  JSON.stringify(expectedPolicyCatalogs),
) as unknown;
const expectedGroupsForVersion = [
  {
    id: "group-001",
    updatedAt: groupUpdatedAt.toISOString(),
  },
];
const expectedOrgUnitsForVersion = [
  {
    id: "org-001",
    updatedAt: orgUnitUpdatedAt.toISOString(),
  },
];
const expectedOrgUnitMembershipsForVersion = [
  {
    id: "org-001",
    membershipUpdatedAt: membershipUpdatedAt.toISOString(),
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
      groups: expectedGroupsForVersion,
      orgUnits: expectedOrgUnitsForVersion,
      orgUnitMemberships: expectedOrgUnitMembershipsForVersion,
      catalogs: expectedPolicyCatalogsForVersion,
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
    mockOrgUnitFindMany.mockResolvedValue([
      { id: "org-001", parentId: null, updatedAt: orgUnitUpdatedAt },
    ]);
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
        accessRequests: false,
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
    expect(
      findUniqueArgs?.select.groupMemberships.select.group.select,
    ).not.toHaveProperty("catalogPermissions");
    expect(
      findUniqueArgs?.select.groupMemberships.select.group.select,
    ).not.toHaveProperty("catalogToolPermissions");
    expect(findUniqueArgs?.select).not.toHaveProperty("catalogPermissions");
    expect(findUniqueArgs?.select).not.toHaveProperty("catalogToolPermissions");
    expect(mockFindSettings).toHaveBeenCalledWith({
      where: { id: "default" },
      select: {
        organizationName: true,
        organizationLogoUrl: true,
      },
    });
    const [findPolicyCatalogsArgs] = mockMcpCatalogFindMany.mock.calls[0] as [
      FindPolicyCatalogsArgs,
    ];
    expect(findPolicyCatalogsArgs.take).toStrictEqual(501);
    expect(
      findPolicyCatalogsArgs.select.orgUnitCatalogPermissions.orderBy,
    ).toStrictEqual([{ orgUnitId: "asc" }]);
    expect(
      findPolicyCatalogsArgs.select.orgUnitCatalogPermissions.where.orgUnitId
        .in,
    ).toStrictEqual(["org-001"]);
    expect(
      findPolicyCatalogsArgs.select.groupCatalogPermissions.orderBy,
    ).toStrictEqual([{ groupId: "asc" }]);
    expect(
      findPolicyCatalogsArgs.select.groupCatalogPermissions.where.groupId.in,
    ).toStrictEqual(["group-001"]);
    expect(
      findPolicyCatalogsArgs.select.userCatalogPermissions.where.userId,
    ).toStrictEqual("user-001");
    expect(
      findPolicyCatalogsArgs.select.userCatalogPermissions.where.OR[0],
    ).toStrictEqual({ expiresAt: null });
    expect(
      findPolicyCatalogsArgs.select.userCatalogPermissions.where.OR[1].expiresAt
        .gt,
    ).toBeInstanceOf(Date);
    expect(
      findPolicyCatalogsArgs.select.userCatalogPermissions.orderBy,
    ).toStrictEqual([{ id: "asc" }]);
    expect(
      findPolicyCatalogsArgs.select.tools.select.groupPermissions.orderBy,
    ).toStrictEqual([{ groupId: "asc" }]);
    expect(findPolicyCatalogsArgs.select.tools.take).toStrictEqual(501);
    expect(
      findPolicyCatalogsArgs.select.tools.select.groupPermissions.where.groupId
        .in,
    ).toStrictEqual(["group-001"]);
    expect(
      findPolicyCatalogsArgs.select.tools.select.userPermissions.where.userId,
    ).toStrictEqual("user-001");
    expect(
      findPolicyCatalogsArgs.select.tools.select.userPermissions.where.OR[0],
    ).toStrictEqual({ expiresAt: null });
    expect(
      findPolicyCatalogsArgs.select.tools.select.userPermissions.where.OR[1]
        .expiresAt.gt,
    ).toBe(
      findPolicyCatalogsArgs.select.userCatalogPermissions.where.OR[1].expiresAt
        .gt,
    );
    expect(
      findPolicyCatalogsArgs.select.tools.select.orgUnitPermissions.where
        .orgUnitId.in,
    ).toStrictEqual(["org-001"]);
    expect(
      findPolicyCatalogsArgs.select.tools.select.orgUnitPermissions.orderBy,
    ).toStrictEqual([{ orgUnitId: "asc" }]);
    expect(
      findPolicyCatalogsArgs.select.tools.select.userPermissions.orderBy,
    ).toStrictEqual([{ id: "asc" }]);
  });

  test("policyVersion対象カタログが上限を超えた場合は不完全なhashを返さない", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockMcpCatalogFindMany.mockResolvedValue(
      Array.from({ length: 501 }, (_, index) => ({
        ...expectedPolicyCatalogs[0]!,
        id: `catalog-${String(index).padStart(3, "0")}`,
      })),
    );

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Internal Server Error",
    });
    expect(response.status).toStrictEqual(500);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "MCP catalog count exceeded the session policy limit (500); refusing incomplete policyVersion.",
    );
    consoleErrorSpy.mockRestore();
  });

  test("policyVersion対象ツールが上限を超えた場合は不完全なhashを返さない", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mockMcpCatalogFindMany.mockResolvedValue([
      {
        ...expectedPolicyCatalogs[0]!,
        tools: Array.from({ length: 501 }, (_, index) => ({
          ...expectedPolicyCatalogs[0]!.tools[0]!,
          id: `tool-${String(index).padStart(3, "0")}`,
        })),
      },
    ]);

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Internal Server Error",
    });
    expect(response.status).toStrictEqual(500);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "MCP tool count exceeded the session policy limit (500) for catalog catalog-001; refusing incomplete policyVersion.",
    );
    consoleErrorSpy.mockRestore();
  });

  test("ユーザー単位のツール権限をセッション権限に含める", async () => {
    mockMcpCatalogFindMany.mockResolvedValue([
      {
        ...expectedPolicyCatalogs[0]!,
        tools: [
          {
            ...expectedPolicyCatalogs[0]!.tools[0]!,
            userPermissions: [
              {
                userId: "user-001",
                effect: PolicyEffect.DENY,
                reason: "Temporary block",
                expiresAt: null,
                updatedAt: new Date("2026-05-03T10:20:00.000Z"),
              },
            ],
          },
        ],
      },
    ]);

    const response = await GET(buildRequest());
    const body = (await response.json()) as { permissions: unknown[] };

    expect(response.status).toStrictEqual(200);
    expect(body.permissions).toStrictEqual(
      expect.arrayContaining([
        {
          source: "USER",
          scope: "TOOL",
          catalogId: "catalog-001",
          toolId: "tool-001",
          effect: PolicyEffect.DENY,
          reason: "Temporary block",
          expiresAt: null,
        },
      ]),
    );
  });

  test("所属グループがない場合は存在しないIDでグループ権限を空に絞る", async () => {
    mockFindUnique.mockResolvedValue({ ...activeUser, groupMemberships: [] });

    const response = await GET(buildRequest());

    expect(response.status).toStrictEqual(200);
    const [findPolicyCatalogsArgs] = mockMcpCatalogFindMany.mock.calls[0] as [
      FindPolicyCatalogsArgs,
    ];
    expect(
      findPolicyCatalogsArgs.select.groupCatalogPermissions.where.groupId.in,
    ).toStrictEqual(["__NO_GROUP_PERMISSION__"]);
    expect(
      findPolicyCatalogsArgs.select.tools.select.groupPermissions.where.groupId
        .in,
    ).toStrictEqual(["__NO_GROUP_PERMISSION__"]);
    expect(
      findPolicyCatalogsArgs.select.orgUnitCatalogPermissions.where.orgUnitId
        .in,
    ).toStrictEqual(["org-001"]);
  });

  test("所属部署がない場合は存在しないIDで部署権限を空に絞る", async () => {
    mockFindUnique.mockResolvedValue({ ...activeUser, orgUnitMemberships: [] });

    const response = await GET(buildRequest());

    expect(response.status).toStrictEqual(200);
    expect(mockOrgUnitFindMany).not.toHaveBeenCalled();
    const [findPolicyCatalogsArgs] = mockMcpCatalogFindMany.mock.calls[0] as [
      FindPolicyCatalogsArgs,
    ];
    expect(
      findPolicyCatalogsArgs.select.orgUnitCatalogPermissions.where.orgUnitId
        .in,
    ).toStrictEqual(["__NO_ORG_UNIT_PERMISSION__"]);
    expect(
      findPolicyCatalogsArgs.select.tools.select.orgUnitPermissions.where
        .orgUnitId.in,
    ).toStrictEqual(["__NO_ORG_UNIT_PERMISSION__"]);
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
      accessRequests: false,
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
    expect(mockMcpCatalogFindMany).not.toHaveBeenCalled();
  });

  test("無効化されたユーザーは401を返す", async () => {
    mockFindUnique.mockResolvedValue({ ...activeUser, isActive: false });

    const response = await GET(buildRequest());

    await expect(response.json()).resolves.toStrictEqual({
      error: "Unauthorized",
    });
    expect(response.status).toStrictEqual(401);
    expect(mockMcpCatalogFindMany).not.toHaveBeenCalled();
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

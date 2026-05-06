import { describe, expect, test, vi } from "vitest";
import { McpCatalogStatus, PolicyEffect } from "@tumiki/internal-db";
import {
  buildPolicyVersion,
  collectPolicyOrgUnitIds,
  evaluateCatalogPermissions,
  getPolicyContextForUser,
  getPolicyOrgUnitsForMemberships,
  POLICY_CONTEXT_ORG_UNIT_LIMIT,
  type CatalogPolicyInput,
  type PolicyUser,
} from "../effective-permissions";

const now = new Date("2026-05-04T00:00:00.000Z");

const buildUser = (overrides: Partial<PolicyUser> = {}): PolicyUser => ({
  id: "user-001",
  isActive: true,
  updatedAt: now,
  orgUnitMemberships: [
    {
      updatedAt: now,
      orgUnit: { id: "child", parentId: "parent", updatedAt: now },
    },
  ],
  groupMemberships: [],
  ...overrides,
});

const buildCatalog = (
  permissions: CatalogPolicyInput["tools"][number]["orgUnitPermissions"],
): CatalogPolicyInput => ({
  id: "catalog-001",
  slug: "github",
  status: McpCatalogStatus.ACTIVE,
  updatedAt: now,
  orgUnitCatalogPermissions: [],
  groupCatalogPermissions: [],
  userCatalogPermissions: [],
  tools: [
    {
      id: "tool-001",
      name: "create_issue",
      defaultAllowed: false,
      updatedAt: now,
      orgUnitPermissions: permissions,
      groupPermissions: [],
      userPermissions: [],
    },
  ],
});

const orgUnits = [
  { id: "parent", parentId: null },
  { id: "child", parentId: "parent" },
];

describe("evaluateCatalogPermissions", () => {
  test("親部署のALLOWを子部署へ継承する", () => {
    const result = evaluateCatalogPermissions(
      buildUser(),
      buildCatalog([
        { orgUnitId: "parent", effect: PolicyEffect.ALLOW, updatedAt: now },
      ]),
      orgUnits,
    );

    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: true,
      deniedReason: null,
    });
    expect(result.permissions.execute).toStrictEqual(true);
  });

  test("子部署DENYが親部署ALLOWを上書きする", () => {
    const result = evaluateCatalogPermissions(
      buildUser(),
      buildCatalog([
        { orgUnitId: "parent", effect: PolicyEffect.ALLOW, updatedAt: now },
        { orgUnitId: "child", effect: PolicyEffect.DENY, updatedAt: now },
      ]),
      orgUnits,
    );

    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: false,
      deniedReason: "org_unit_tool_denied",
    });
  });

  test("ユーザーDENYは部署ALLOWより優先される", () => {
    const result = evaluateCatalogPermissions(
      buildUser(),
      {
        ...buildCatalog([
          { orgUnitId: "child", effect: PolicyEffect.ALLOW, updatedAt: now },
        ]),
        userCatalogPermissions: [
          {
            userId: "user-001",
            effect: PolicyEffect.DENY,
            updatedAt: now,
            reason: null,
            expiresAt: null,
          },
        ],
      },
      orgUnits,
    );

    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: false,
      deniedReason: "user_catalog_denied",
    });
  });

  test("未設定はdefault denyになる", () => {
    const result = evaluateCatalogPermissions(
      buildUser(),
      buildCatalog([]),
      orgUnits,
    );

    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: false,
      deniedReason: "not_granted",
    });
    expect(result.permissions.execute).toStrictEqual(false);
  });

  test("DISABLEDカタログは権限があっても利用不可にする", () => {
    const result = evaluateCatalogPermissions(
      buildUser(),
      {
        ...buildCatalog([]),
        status: McpCatalogStatus.DISABLED,
        tools: [
          {
            ...buildCatalog([]).tools[0]!,
            defaultAllowed: true,
          },
        ],
      },
      orgUnits,
    );

    expect(result.permissions).toStrictEqual({
      read: false,
      write: false,
      execute: false,
    });
    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: false,
      deniedReason: "catalog_disabled",
    });
  });

  test("ツール未登録のカタログはカタログ単位ALLOWがあっても利用不可にする", () => {
    const result = evaluateCatalogPermissions(
      buildUser(),
      {
        ...buildCatalog([]),
        orgUnitCatalogPermissions: [
          { orgUnitId: "child", effect: PolicyEffect.ALLOW, updatedAt: now },
        ],
        tools: [],
      },
      orgUnits,
    );

    expect(result.permissions).toStrictEqual({
      read: false,
      write: false,
      execute: false,
    });
    expect([...result.tools.entries()]).toStrictEqual([]);
  });

  test("部署ポリシー未設定でもグループ権限があれば許可される", () => {
    const result = evaluateCatalogPermissions(
      buildUser({
        groupMemberships: [
          {
            group: { id: "group-001" },
          },
        ],
      }),
      {
        ...buildCatalog([]),
        groupCatalogPermissions: [
          { groupId: "group-001", effect: PolicyEffect.ALLOW, updatedAt: now },
        ],
      },
      orgUnits,
    );

    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: true,
      deniedReason: null,
    });
    expect(result.permissions.execute).toStrictEqual(true);
  });

  test("部署DENYはグループALLOWより優先される", () => {
    const result = evaluateCatalogPermissions(
      buildUser({
        groupMemberships: [
          {
            group: { id: "group-001" },
          },
        ],
      }),
      {
        ...buildCatalog([
          { orgUnitId: "child", effect: PolicyEffect.DENY, updatedAt: now },
        ]),
        groupCatalogPermissions: [
          { groupId: "group-001", effect: PolicyEffect.ALLOW, updatedAt: now },
        ],
      },
      orgUnits,
    );

    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: false,
      deniedReason: "org_unit_tool_denied",
    });
  });

  test("グループDENYはユーザーALLOWより優先される", () => {
    const result = evaluateCatalogPermissions(
      buildUser({
        groupMemberships: [{ group: { id: "group-001" } }],
      }),
      {
        ...buildCatalog([]),
        groupCatalogPermissions: [
          { groupId: "group-001", effect: PolicyEffect.DENY, updatedAt: now },
        ],
        userCatalogPermissions: [
          {
            userId: "user-001",
            effect: PolicyEffect.ALLOW,
            updatedAt: now,
            reason: null,
            expiresAt: null,
          },
        ],
      },
      orgUnits,
    );

    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: false,
      deniedReason: "group_catalog_denied",
    });
    expect(result.permissions.execute).toStrictEqual(false);
  });

  test("ツール単位の部署DENYはカタログ単位のユーザーALLOWより優先される", () => {
    const result = evaluateCatalogPermissions(
      buildUser(),
      {
        ...buildCatalog([
          { orgUnitId: "child", effect: PolicyEffect.DENY, updatedAt: now },
        ]),
        userCatalogPermissions: [
          {
            userId: "user-001",
            effect: PolicyEffect.ALLOW,
            updatedAt: now,
            reason: null,
            expiresAt: null,
          },
        ],
      },
      orgUnits,
    );

    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: false,
      deniedReason: "org_unit_tool_denied",
    });
    expect(result.permissions.execute).toStrictEqual(false);
  });

  test("カタログ単位のユーザーDENYはツール単位のユーザーALLOWより優先される", () => {
    const baseTool = buildCatalog([]).tools[0]!;
    const result = evaluateCatalogPermissions(
      buildUser(),
      {
        ...buildCatalog([]),
        userCatalogPermissions: [
          {
            userId: "user-001",
            effect: PolicyEffect.DENY,
            updatedAt: now,
            reason: null,
            expiresAt: null,
          },
        ],
        tools: [
          {
            ...baseTool,
            userPermissions: [
              {
                userId: "user-001",
                effect: PolicyEffect.ALLOW,
                updatedAt: now,
                reason: null,
                expiresAt: null,
              },
            ],
          },
        ],
      },
      orgUnits,
    );

    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: false,
      deniedReason: "user_catalog_denied",
    });
    expect(result.permissions.execute).toStrictEqual(false);
  });

  test("期限切れのユーザー個別権限は無視する", () => {
    const baseTool = buildCatalog([]).tools[0]!;
    const result = evaluateCatalogPermissions(
      buildUser(),
      {
        ...buildCatalog([]),
        userCatalogPermissions: [
          {
            userId: "user-001",
            effect: PolicyEffect.ALLOW,
            updatedAt: now,
            reason: null,
            expiresAt: new Date("2000-01-01T00:00:00.000Z"),
          },
        ],
        tools: [
          {
            ...baseTool,
            userPermissions: [
              {
                userId: "user-001",
                effect: PolicyEffect.ALLOW,
                updatedAt: now,
                reason: null,
                expiresAt: new Date("2000-01-01T00:00:00.000Z"),
              },
            ],
          },
        ],
      },
      orgUnits,
    );

    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: false,
      deniedReason: "not_granted",
    });
    expect(result.permissions.execute).toStrictEqual(false);
  });

  test("カタログ単位のグループDENYは全ツールを拒否する", () => {
    const baseTool = buildCatalog([]).tools[0]!;
    const result = evaluateCatalogPermissions(
      buildUser({
        groupMemberships: [{ group: { id: "group-001" } }],
      }),
      {
        ...buildCatalog([]),
        groupCatalogPermissions: [
          { groupId: "group-001", effect: PolicyEffect.DENY, updatedAt: now },
        ],
        tools: [
          { ...baseTool, id: "tool-001", defaultAllowed: true },
          { ...baseTool, id: "tool-002", name: "delete_issue" },
        ],
      },
      orgUnits,
    );

    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: false,
      deniedReason: "group_catalog_denied",
    });
    expect(result.tools.get("tool-002")).toStrictEqual({
      allowed: false,
      deniedReason: "group_catalog_denied",
    });
    expect(result.permissions.execute).toStrictEqual(false);
  });

  test("ツールごとの明示ポリシーで許可と拒否が混在する", () => {
    const baseTool = buildCatalog([]).tools[0]!;
    const result = evaluateCatalogPermissions(
      buildUser(),
      {
        ...buildCatalog([]),
        tools: [
          {
            ...baseTool,
            id: "tool-allowed",
            userPermissions: [
              {
                userId: "user-001",
                effect: PolicyEffect.ALLOW,
                updatedAt: now,
                reason: null,
                expiresAt: null,
              },
            ],
          },
          {
            ...baseTool,
            id: "tool-denied",
            name: "delete_issue",
            orgUnitPermissions: [
              { orgUnitId: "child", effect: PolicyEffect.DENY, updatedAt: now },
            ],
          },
        ],
      },
      orgUnits,
    );

    expect(result.tools.get("tool-allowed")).toStrictEqual({
      allowed: true,
      deniedReason: null,
    });
    expect(result.tools.get("tool-denied")).toStrictEqual({
      allowed: false,
      deniedReason: "org_unit_tool_denied",
    });
    expect(result.permissions.execute).toStrictEqual(true);
  });

  test("明示ポリシー未設定ならdefaultAllowedを使う", () => {
    const result = evaluateCatalogPermissions(
      buildUser(),
      {
        ...buildCatalog([]),
        tools: [
          {
            ...buildCatalog([]).tools[0]!,
            defaultAllowed: true,
          },
        ],
      },
      orgUnits,
    );

    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: true,
      deniedReason: null,
    });
    expect(result.permissions.execute).toStrictEqual(true);
  });

  test("部署階層が循環していても所属部署収集で停止する", () => {
    const result = evaluateCatalogPermissions(
      buildUser(),
      buildCatalog([
        { orgUnitId: "parent", effect: PolicyEffect.ALLOW, updatedAt: now },
      ]),
      [
        { id: "parent", parentId: "child" },
        { id: "child", parentId: "parent" },
      ],
    );

    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: true,
      deniedReason: null,
    });
  });
});

describe("collectPolicyOrgUnitIds", () => {
  test("所属部署と祖先部署のIDを返す", () => {
    const result = collectPolicyOrgUnitIds(buildUser().orgUnitMemberships, [
      { id: "parent", parentId: null },
      { id: "child", parentId: "parent" },
    ]);

    expect(result).toStrictEqual(new Set(["child", "parent"]));
  });

  test("部署階層が循環していても停止する", () => {
    const result = collectPolicyOrgUnitIds(buildUser().orgUnitMemberships, [
      { id: "parent", parentId: "child" },
      { id: "child", parentId: "parent" },
    ]);

    expect(result).toStrictEqual(new Set(["child", "parent"]));
  });

  test("所属部署がない場合は空Setを返す", () => {
    const result = collectPolicyOrgUnitIds(
      [],
      [{ id: "parent", parentId: null }],
    );

    expect(result).toStrictEqual(new Set());
  });
});

describe("getPolicyOrgUnitsForMemberships", () => {
  test("必要な親部署だけを取得して所属部署と一緒に返す", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([{ id: "parent", parentId: null, updatedAt: now }]);
    const client = {
      orgUnit: { findMany },
    } as unknown as Parameters<typeof getPolicyOrgUnitsForMemberships>[1];

    await expect(
      getPolicyOrgUnitsForMemberships(buildUser().orgUnitMemberships, client),
    ).resolves.toStrictEqual([
      { id: "child", parentId: "parent", updatedAt: now },
      { id: "parent", parentId: null, updatedAt: now },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { id: { in: ["parent"] } },
      select: { id: true, parentId: true, updatedAt: true },
    });
  });

  test("所属部署がない場合はDBを読まず空配列を返す", async () => {
    const findMany = vi.fn();
    const client = {
      orgUnit: { findMany },
    } as unknown as Parameters<typeof getPolicyOrgUnitsForMemberships>[1];

    await expect(
      getPolicyOrgUnitsForMemberships([], client),
    ).resolves.toStrictEqual([]);
    expect(findMany).not.toHaveBeenCalled();
  });

  test("部署祖先数が上限を超えたらエラーを投げる", async () => {
    const findMany = vi.fn().mockResolvedValue(
      Array.from({ length: POLICY_CONTEXT_ORG_UNIT_LIMIT }, (_, index) => ({
        id: `parent-${index}`,
        parentId: null,
        updatedAt: now,
      })),
    );
    const client = {
      orgUnit: { findMany },
    } as unknown as Parameters<typeof getPolicyOrgUnitsForMemberships>[1];

    await expect(
      getPolicyOrgUnitsForMemberships(buildUser().orgUnitMemberships, client),
    ).rejects.toThrow("exceeded the policy context limit");
  });
});

describe("getPolicyContextForUser", () => {
  test("ユーザーと権限評価に必要な部署祖先を返す", async () => {
    const user = buildUser({
      groupMemberships: [{ group: { id: "group-001" } }],
    });
    const findUnique = vi.fn().mockResolvedValue(user);
    const findMany = vi
      .fn()
      .mockResolvedValue([{ id: "parent", parentId: null, updatedAt: now }]);
    const client = {
      user: { findUnique },
      orgUnit: { findMany },
    } as unknown as Parameters<typeof getPolicyContextForUser>[1];

    await expect(
      getPolicyContextForUser("user-001", client),
    ).resolves.toStrictEqual({
      user,
      orgUnits: [
        { id: "child", parentId: "parent", updatedAt: now },
        { id: "parent", parentId: null, updatedAt: now },
      ],
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "user-001" },
      select: {
        id: true,
        isActive: true,
        updatedAt: true,
        orgUnitMemberships: {
          select: {
            updatedAt: true,
            orgUnit: {
              select: { id: true, parentId: true, path: true, updatedAt: true },
            },
          },
        },
        groupMemberships: {
          select: {
            group: {
              select: { id: true },
            },
          },
        },
      },
    });
  });

  test("ユーザーが存在しない場合は部署を取得せずnullを返す", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const findMany = vi.fn();
    const client = {
      user: { findUnique },
      orgUnit: { findMany },
    } as unknown as Parameters<typeof getPolicyContextForUser>[1];

    await expect(
      getPolicyContextForUser("missing-user", client),
    ).resolves.toStrictEqual({ user: null, orgUnits: [] });
    expect(findMany).not.toHaveBeenCalled();
  });
});

describe("buildPolicyVersion", () => {
  test("同じポリシー状態から決定論的なhashを返す", () => {
    const policyState = {
      catalogs: [{ id: "catalog-001", updatedAt: "2026-05-04T00:00:00.000Z" }],
    };

    expect(buildPolicyVersion(policyState)).toStrictEqual(
      buildPolicyVersion(policyState),
    );
    expect(buildPolicyVersion(policyState)).toMatch(/^pol_v1_[\w-]{32}$/);
  });

  test("異なるポリシー状態から異なるhashを返す", () => {
    const stateA = { catalogs: [{ id: "catalog-001" }] };
    const stateB = { catalogs: [{ id: "catalog-002" }] };

    expect(buildPolicyVersion(stateA)).not.toStrictEqual(
      buildPolicyVersion(stateB),
    );
  });
});

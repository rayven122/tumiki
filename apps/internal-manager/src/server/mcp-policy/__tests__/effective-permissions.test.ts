import { describe, expect, test } from "vitest";
import { PolicyEffect } from "@tumiki/internal-db";
import {
  buildPolicyVersion,
  evaluateCatalogPermissions,
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
      deniedReason: "org_unit_denied",
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
          { userId: "user-001", effect: PolicyEffect.DENY, updatedAt: now },
        ],
      },
      orgUnits,
    );

    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: false,
      deniedReason: "user_denied",
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
      deniedReason: "org_unit_denied",
    });
  });

  test("ツール単位の部署DENYはカタログ単位のユーザーALLOWより優先される", () => {
    const result = evaluateCatalogPermissions(
      buildUser(),
      {
        ...buildCatalog([
          { orgUnitId: "child", effect: PolicyEffect.DENY, updatedAt: now },
        ]),
        userCatalogPermissions: [
          { userId: "user-001", effect: PolicyEffect.ALLOW, updatedAt: now },
        ],
      },
      orgUnits,
    );

    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: false,
      deniedReason: "org_unit_denied",
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
      deniedReason: "group_denied",
    });
    expect(result.tools.get("tool-002")).toStrictEqual({
      allowed: false,
      deniedReason: "group_denied",
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
      deniedReason: "org_unit_denied",
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
});

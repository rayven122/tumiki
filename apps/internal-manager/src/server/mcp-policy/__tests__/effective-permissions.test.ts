import { describe, expect, test } from "vitest";
import { PolicyEffect } from "@tumiki/internal-db";
import {
  evaluateCatalogPermissions,
  type CatalogPolicyInput,
  type PolicyUser,
} from "../effective-permissions";

const now = new Date("2026-05-04T00:00:00.000Z");

const buildUser = (overrides: Partial<PolicyUser> = {}): PolicyUser => ({
  id: "user-001",
  updatedAt: now,
  orgUnitMemberships: [
    {
      updatedAt: now,
      orgUnit: { id: "child", parentId: "parent", updatedAt: now },
    },
  ],
  groupMemberships: [],
  individualPermissions: [],
  ...overrides,
});

const buildCatalog = (
  permissions: CatalogPolicyInput["tools"][number]["orgUnitPermissions"],
): CatalogPolicyInput => ({
  id: "catalog-001",
  slug: "github",
  updatedAt: now,
  tools: [
    {
      id: "tool-001",
      name: "create_issue",
      updatedAt: now,
      orgUnitPermissions: permissions,
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

  test("個人例外は部署DENYより優先される", () => {
    const result = evaluateCatalogPermissions(
      buildUser({
        individualPermissions: [{ mcpServerId: "github", updatedAt: now }],
      }),
      buildCatalog([
        { orgUnitId: "child", effect: PolicyEffect.DENY, updatedAt: now },
      ]),
      orgUnits,
    );

    expect(result.tools.get("tool-001")).toStrictEqual({
      allowed: true,
      deniedReason: null,
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
});

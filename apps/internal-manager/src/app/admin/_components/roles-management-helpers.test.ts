import { describe, expect, test } from "vitest";
import {
  countEffects,
  formatRolePermissionDate,
  getCatalogEffect,
  getToolEffect,
  type MatrixCatalog,
  type MatrixTool,
} from "./roles-management-helpers";

const buildTool = (
  id: string,
  effect: "ALLOW" | "DENY" | null,
): MatrixTool => ({
  id,
  name: id,
  defaultAllowed: false,
  updatedAt: new Date("2026-05-07T00:00:00.000Z"),
  orgUnitPermissions:
    effect === null
      ? []
      : [
          {
            orgUnitId: "org-001",
            toolId: id,
            effect,
          },
        ],
});

const buildCatalog = (
  id: string,
  effect: "ALLOW" | "DENY" | null,
  tools: MatrixTool[],
): MatrixCatalog => ({
  id,
  name: id,
  slug: id,
  status: "ACTIVE",
  updatedAt: new Date("2026-05-07T00:00:00.000Z"),
  orgUnitCatalogPermissions:
    effect === null
      ? []
      : [
          {
            orgUnitId: "org-001",
            catalogId: id,
            effect,
          },
        ],
  tools,
});

describe("roles-management-helpers", () => {
  test("getCatalogEffect は部署のカタログ権限を返す", () => {
    expect(getCatalogEffect(buildCatalog("github", "ALLOW", []))).toBe("ALLOW");
    expect(getCatalogEffect(buildCatalog("slack", null, []))).toBeNull();
  });

  test("getToolEffect は部署のツール権限を返す", () => {
    expect(getToolEffect(buildTool("issue-create", "DENY"))).toBe("DENY");
    expect(getToolEffect(buildTool("pull-request", null))).toBeNull();
  });

  test("countEffects はカタログ権限とツール権限を分けて集計する", () => {
    const catalogs = [
      buildCatalog("github", "ALLOW", [
        buildTool("issue-create", "ALLOW"),
        buildTool("repo-delete", "DENY"),
      ]),
      buildCatalog("slack", "DENY", [
        buildTool("message-send", null),
        buildTool("admin", "DENY"),
      ]),
    ];

    expect(countEffects(catalogs)).toStrictEqual({
      catalogAllow: 1,
      catalogDeny: 1,
      toolAllow: 1,
      toolDeny: 2,
    });
  });

  test("formatRolePermissionDate は日付と空値を表示用に整形する", () => {
    expect(formatRolePermissionDate("2026-05-07T00:00:00.000Z")).toBe(
      "2026/5/7",
    );
    expect(formatRolePermissionDate(null)).toBe("-");
  });
});

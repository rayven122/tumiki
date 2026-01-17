/**
 * ロール判定ユーティリティのユニットテスト
 */

import { describe, test, expect } from "vitest";
import { isAdmin, isOrganizationRole } from "../roleService.js";

describe("isAdmin", () => {
  test("Owner ロールの場合は true を返す", () => {
    const roles = ["Owner"];
    expect(isAdmin(roles)).toBe(true);
  });

  test("Admin ロールの場合は true を返す", () => {
    const roles = ["Admin"];
    expect(isAdmin(roles)).toBe(true);
  });

  test("Owner と Admin の両方がある場合は true を返す", () => {
    const roles = ["Owner", "Admin"];
    expect(isAdmin(roles)).toBe(true);
  });

  test("Member ロールのみの場合は false を返す", () => {
    const roles = ["Member"];
    expect(isAdmin(roles)).toBe(false);
  });

  test("Viewer ロールのみの場合は false を返す", () => {
    const roles = ["Viewer"];
    expect(isAdmin(roles)).toBe(false);
  });

  test("空配列の場合は false を返す", () => {
    const roles: string[] = [];
    expect(isAdmin(roles)).toBe(false);
  });

  test("他のロールと混在している場合でも Admin があれば true を返す", () => {
    const roles = ["Member", "Admin", "custom-role"];
    expect(isAdmin(roles)).toBe(true);
  });

  test("カスタムロールのみの場合は false を返す", () => {
    const roles = ["custom-role-1", "custom-role-2"];
    expect(isAdmin(roles)).toBe(false);
  });
});

describe("isOrganizationRole", () => {
  test("Owner は OrganizationRole である", () => {
    expect(isOrganizationRole("Owner")).toBe(true);
  });

  test("Admin は OrganizationRole である", () => {
    expect(isOrganizationRole("Admin")).toBe(true);
  });

  test("Member は OrganizationRole である", () => {
    expect(isOrganizationRole("Member")).toBe(true);
  });

  test("Viewer は OrganizationRole である", () => {
    expect(isOrganizationRole("Viewer")).toBe(true);
  });

  test("カスタムロールは OrganizationRole ではない", () => {
    expect(isOrganizationRole("custom-role")).toBe(false);
  });

  test("空文字は OrganizationRole ではない", () => {
    expect(isOrganizationRole("")).toBe(false);
  });

  test("大文字小文字が異なる場合は OrganizationRole ではない", () => {
    expect(isOrganizationRole("owner")).toBe(false);
    expect(isOrganizationRole("ADMIN")).toBe(false);
    expect(isOrganizationRole("member")).toBe(false);
  });
});

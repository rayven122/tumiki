import { describe, expect, test } from "vitest";
import { parseOrgRolesFromGroupPaths } from "./getTumikiClaims";

describe("parseOrgRolesFromGroupPaths", () => {
  test("組織に対するロールを正しく抽出する", () => {
    const groupRoles = ["/rayven/_Owner", "/acme/_Member", "/other/_Admin"];

    const result = parseOrgRolesFromGroupPaths(groupRoles, "rayven");

    expect(result).toStrictEqual(["Owner"]);
  });

  test("複数のロールを持つ場合（通常は発生しないが念のため）", () => {
    const groupRoles = ["/rayven/_Owner", "/rayven/_Admin"];

    const result = parseOrgRolesFromGroupPaths(groupRoles, "rayven");

    expect(result).toStrictEqual(["Owner", "Admin"]);
  });

  test("該当する組織がない場合は空配列を返す", () => {
    const groupRoles = ["/acme/_Owner", "/other/_Member"];

    const result = parseOrgRolesFromGroupPaths(groupRoles, "rayven");

    expect(result).toStrictEqual([]);
  });

  test("空のgroup_rolesの場合は空配列を返す", () => {
    const result = parseOrgRolesFromGroupPaths([], "rayven");

    expect(result).toStrictEqual([]);
  });

  test("ロールサブグループ以外のサブグループは無視する", () => {
    // 部署やチームのサブグループは _プレフィックスがないため無視される
    const groupRoles = [
      "/rayven/_Owner",
      "/rayven/engineering",
      "/rayven/sales",
    ];

    const result = parseOrgRolesFromGroupPaths(groupRoles, "rayven");

    expect(result).toStrictEqual(["Owner"]);
  });

  test("部分一致しないことを確認（rayven-devはrayvenと別扱い）", () => {
    const groupRoles = ["/rayven-dev/_Owner", "/rayven/_Member"];

    const result = parseOrgRolesFromGroupPaths(groupRoles, "rayven");

    expect(result).toStrictEqual(["Member"]);
  });

  test("ネストしたサブグループのパスも正しく処理する", () => {
    // 深いネストのパスは組織直下のロールサブグループとしてマッチしない
    const groupRoles = ["/rayven/_Owner", "/rayven/engineering/_Lead"];

    const result = parseOrgRolesFromGroupPaths(groupRoles, "rayven");

    // /rayven/_Owner はマッチ、/rayven/engineering/_Lead は組織直下ではないので無視
    expect(result).toStrictEqual(["Owner"]);
  });

  test("ロールサブグループ配下のパスは無視する", () => {
    // 不正なパス形式（ロールサブグループの下にさらにパスがある）
    const groupRoles = ["/rayven/_Owner/something", "/rayven/_Admin"];

    const result = parseOrgRolesFromGroupPaths(groupRoles, "rayven");

    // /rayven/_Owner/something は無視、/rayven/_Admin のみマッチ
    expect(result).toStrictEqual(["Admin"]);
  });
});

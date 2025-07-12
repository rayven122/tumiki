import { describe, test, expect } from "bun:test";
import {
  PERMISSION_ACTIONS,
  RESOURCE_TYPES,
  PERMISSION_SETS,
  comparePermissions,
  normalizePermissions,
  hasPermission,
  hasAllPermissions,
  getPermissionDisplayName,
  getResourceTypeDisplayName,
  getPermissionActionDisplayName,
  type Permission,
} from "../permissions";

describe("permissions", () => {
  describe("権限定数のテスト", () => {
    test("PERMISSION_ACTIONSが正しく定義されている", () => {
      expect(PERMISSION_ACTIONS.CREATE).toStrictEqual("CREATE");
      expect(PERMISSION_ACTIONS.READ).toStrictEqual("READ");
      expect(PERMISSION_ACTIONS.UPDATE).toStrictEqual("UPDATE");
      expect(PERMISSION_ACTIONS.DELETE).toStrictEqual("DELETE");
      expect(PERMISSION_ACTIONS.MANAGE).toStrictEqual("MANAGE");
    });

    test("RESOURCE_TYPESが正しく定義されている", () => {
      expect(RESOURCE_TYPES.GROUP).toStrictEqual("GROUP");
      expect(RESOURCE_TYPES.MEMBER).toStrictEqual("MEMBER");
      expect(RESOURCE_TYPES.ROLE).toStrictEqual("ROLE");
      expect(RESOURCE_TYPES.MCP_SERVER_CONFIG).toStrictEqual("MCP_SERVER_CONFIG");
      expect(RESOURCE_TYPES.TOOL_GROUP).toStrictEqual("TOOL_GROUP");
      expect(RESOURCE_TYPES.MCP_SERVER_INSTANCE).toStrictEqual("MCP_SERVER_INSTANCE");
    });
  });

  describe("権限セットのテスト", () => {
    test("READ_ONLY権限セットが正しく生成されている", () => {
      const readOnlyPermissions = PERMISSION_SETS.READ_ONLY;
      expect(readOnlyPermissions).toHaveLength(6); // 6つのリソースタイプ
      
      readOnlyPermissions.forEach(permission => {
        expect(permission.action).toStrictEqual("READ");
      });
    });

    test("ADMIN権限セットがすべての権限を含んでいる", () => {
      const adminPermissions = PERMISSION_SETS.ADMIN;
      expect(adminPermissions).toHaveLength(30); // 6リソース × 5アクション
    });
  });

  describe("権限比較関数のテスト", () => {
    test("権限を正しく比較する", () => {
      const permission1: Permission = {
        resourceType: "GROUP",
        action: "CREATE",
      };
      const permission2: Permission = {
        resourceType: "GROUP",
        action: "READ",
      };
      const permission3: Permission = {
        resourceType: "MEMBER",
        action: "CREATE",
      };

      expect(comparePermissions(permission1, permission2)).toBeLessThan(0);
      expect(comparePermissions(permission1, permission3)).toBeLessThan(0);
    });
  });

  describe("権限正規化関数のテスト", () => {
    test("重複した権限を削除する", () => {
      const permissions: Permission[] = [
        { resourceType: "GROUP", action: "CREATE" },
        { resourceType: "GROUP", action: "CREATE" }, // 重複
        { resourceType: "GROUP", action: "READ" },
      ];

      const normalized = normalizePermissions(permissions);
      expect(normalized).toHaveLength(2);
    });

    test("権限を正しくソートする", () => {
      const permissions: Permission[] = [
        { resourceType: "MEMBER", action: "CREATE" },
        { resourceType: "GROUP", action: "READ" },
        { resourceType: "GROUP", action: "CREATE" },
      ];

      const normalized = normalizePermissions(permissions);
      expect(normalized[0]).toStrictEqual({ resourceType: "GROUP", action: "CREATE" });
      expect(normalized[1]).toStrictEqual({ resourceType: "GROUP", action: "READ" });
      expect(normalized[2]).toStrictEqual({ resourceType: "MEMBER", action: "CREATE" });
    });
  });

  describe("権限チェック関数のテスト", () => {
    const userPermissions: Permission[] = [
      { resourceType: "GROUP", action: "CREATE" },
      { resourceType: "GROUP", action: "READ" },
      { resourceType: "MEMBER", action: "READ" },
    ];

    test("権限が存在する場合はtrueを返す", () => {
      expect(hasPermission(userPermissions, { resourceType: "GROUP", action: "CREATE" })).toBe(true);
      expect(hasPermission(userPermissions, { resourceType: "MEMBER", action: "READ" })).toBe(true);
    });

    test("権限が存在しない場合はfalseを返す", () => {
      expect(hasPermission(userPermissions, { resourceType: "GROUP", action: "DELETE" })).toBe(false);
      expect(hasPermission(userPermissions, { resourceType: "ROLE", action: "READ" })).toBe(false);
    });

    test("すべての権限が存在する場合はtrueを返す", () => {
      const requiredPermissions: Permission[] = [
        { resourceType: "GROUP", action: "CREATE" },
        { resourceType: "GROUP", action: "READ" },
      ];
      
      expect(hasAllPermissions(userPermissions, requiredPermissions)).toBe(true);
    });

    test("一部の権限が不足する場合はfalseを返す", () => {
      const requiredPermissions: Permission[] = [
        { resourceType: "GROUP", action: "CREATE" },
        { resourceType: "GROUP", action: "DELETE" }, // この権限がない
      ];
      
      expect(hasAllPermissions(userPermissions, requiredPermissions)).toBe(false);
    });
  });

  describe("表示名取得関数のテスト", () => {
    test("権限の日本語表示名が正しく取得できる", () => {
      const permission: Permission = {
        resourceType: "GROUP",
        action: "CREATE",
      };
      
      expect(getPermissionDisplayName(permission)).toStrictEqual("グループ作成");
    });

    test("リソースタイプの日本語表示名が正しく取得できる", () => {
      expect(getResourceTypeDisplayName("GROUP")).toStrictEqual("グループ");
      expect(getResourceTypeDisplayName("MEMBER")).toStrictEqual("メンバー");
      expect(getResourceTypeDisplayName("ROLE")).toStrictEqual("ロール");
    });

    test("権限アクションの日本語表示名が正しく取得できる", () => {
      expect(getPermissionActionDisplayName("CREATE")).toStrictEqual("作成");
      expect(getPermissionActionDisplayName("READ")).toStrictEqual("読み取り");
      expect(getPermissionActionDisplayName("UPDATE")).toStrictEqual("編集");
      expect(getPermissionActionDisplayName("DELETE")).toStrictEqual("削除");
      expect(getPermissionActionDisplayName("MANAGE")).toStrictEqual("管理");
    });
  });
});
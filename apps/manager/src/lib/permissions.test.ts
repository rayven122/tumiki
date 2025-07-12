import { describe, test, expect } from "vitest";
import { PermissionAction, ResourceType } from "@tumiki/db";
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissionsForResource,
  getPermissionDisplayName,
  getResourceTypeDisplayName,
  getActionDisplayName,
  getPermissionChanges,
  groupPermissionsByResource,
  PERMISSION_SETS,
  type Permission,
} from "./permissions";

describe("permissions utility functions", () => {
  const samplePermissions: Permission[] = [
    { resourceType: ResourceType.GROUP, action: PermissionAction.READ },
    { resourceType: ResourceType.GROUP, action: PermissionAction.CREATE },
    { resourceType: ResourceType.MEMBER, action: PermissionAction.READ },
    { resourceType: ResourceType.ROLE, action: PermissionAction.MANAGE },
  ];

  describe("hasPermission", () => {
    test("特定の権限を持っている場合はtrueを返す", () => {
      const result = hasPermission(samplePermissions, ResourceType.GROUP, PermissionAction.READ);
      expect(result).toBe(true);
    });

    test("特定の権限を持っていない場合はfalseを返す", () => {
      const result = hasPermission(samplePermissions, ResourceType.GROUP, PermissionAction.DELETE);
      expect(result).toBe(false);
    });

    test("存在しないリソースタイプの場合はfalseを返す", () => {
      const result = hasPermission(samplePermissions, ResourceType.MCP_SERVER_CONFIG, PermissionAction.READ);
      expect(result).toBe(false);
    });
  });

  describe("hasAllPermissions", () => {
    test("必要な権限を全て持っている場合はtrueを返す", () => {
      const requiredPermissions: Permission[] = [
        { resourceType: ResourceType.GROUP, action: PermissionAction.READ },
        { resourceType: ResourceType.MEMBER, action: PermissionAction.READ },
      ];
      const result = hasAllPermissions(samplePermissions, requiredPermissions);
      expect(result).toBe(true);
    });

    test("必要な権限の一部を持っていない場合はfalseを返す", () => {
      const requiredPermissions: Permission[] = [
        { resourceType: ResourceType.GROUP, action: PermissionAction.READ },
        { resourceType: ResourceType.GROUP, action: PermissionAction.DELETE },
      ];
      const result = hasAllPermissions(samplePermissions, requiredPermissions);
      expect(result).toBe(false);
    });

    test("空の必要権限リストの場合はtrueを返す", () => {
      const result = hasAllPermissions(samplePermissions, []);
      expect(result).toBe(true);
    });
  });

  describe("hasAnyPermission", () => {
    test("必要な権限のいずれかを持っている場合はtrueを返す", () => {
      const requiredPermissions: Permission[] = [
        { resourceType: ResourceType.GROUP, action: PermissionAction.DELETE },
        { resourceType: ResourceType.GROUP, action: PermissionAction.READ },
      ];
      const result = hasAnyPermission(samplePermissions, requiredPermissions);
      expect(result).toBe(true);
    });

    test("必要な権限のどれも持っていない場合はfalseを返す", () => {
      const requiredPermissions: Permission[] = [
        { resourceType: ResourceType.GROUP, action: PermissionAction.DELETE },
        { resourceType: ResourceType.MEMBER, action: PermissionAction.DELETE },
      ];
      const result = hasAnyPermission(samplePermissions, requiredPermissions);
      expect(result).toBe(false);
    });

    test("空の必要権限リストの場合はfalseを返す", () => {
      const result = hasAnyPermission(samplePermissions, []);
      expect(result).toBe(false);
    });
  });

  describe("getPermissionsForResource", () => {
    test("特定のリソースタイプの権限アクションを取得する", () => {
      const result = getPermissionsForResource(samplePermissions, ResourceType.GROUP);
      expect(result).toEqual([PermissionAction.READ, PermissionAction.CREATE]);
    });

    test("権限を持たないリソースタイプの場合は空配列を返す", () => {
      const result = getPermissionsForResource(samplePermissions, ResourceType.MCP_SERVER_CONFIG);
      expect(result).toEqual([]);
    });
  });

  describe("display name functions", () => {
    test("getPermissionDisplayName は適切な表示名を返す", () => {
      const result = getPermissionDisplayName(ResourceType.GROUP, PermissionAction.CREATE);
      expect(result).toBe("グループの作成");
    });

    test("getResourceTypeDisplayName は適切な表示名を返す", () => {
      expect(getResourceTypeDisplayName(ResourceType.GROUP)).toBe("グループ");
      expect(getResourceTypeDisplayName(ResourceType.MEMBER)).toBe("メンバー");
      expect(getResourceTypeDisplayName(ResourceType.ROLE)).toBe("ロール");
    });

    test("getActionDisplayName は適切な表示名を返す", () => {
      expect(getActionDisplayName(PermissionAction.CREATE)).toBe("作成");
      expect(getActionDisplayName(PermissionAction.READ)).toBe("読み取り");
      expect(getActionDisplayName(PermissionAction.UPDATE)).toBe("編集");
      expect(getActionDisplayName(PermissionAction.DELETE)).toBe("削除");
      expect(getActionDisplayName(PermissionAction.MANAGE)).toBe("管理");
    });
  });

  describe("getPermissionChanges", () => {
    test("権限の追加と削除を正しく検出する", () => {
      const oldPermissions: Permission[] = [
        { resourceType: ResourceType.GROUP, action: PermissionAction.READ },
        { resourceType: ResourceType.MEMBER, action: PermissionAction.READ },
      ];
      
      const newPermissions: Permission[] = [
        { resourceType: ResourceType.GROUP, action: PermissionAction.READ },
        { resourceType: ResourceType.GROUP, action: PermissionAction.CREATE },
      ];

      const result = getPermissionChanges(oldPermissions, newPermissions);
      
      expect(result.added).toEqual([
        { resourceType: ResourceType.GROUP, action: PermissionAction.CREATE },
      ]);
      
      expect(result.removed).toEqual([
        { resourceType: ResourceType.MEMBER, action: PermissionAction.READ },
      ]);
    });

    test("変更がない場合は空の配列を返す", () => {
      const permissions: Permission[] = [
        { resourceType: ResourceType.GROUP, action: PermissionAction.READ },
      ];

      const result = getPermissionChanges(permissions, permissions);
      
      expect(result.added).toEqual([]);
      expect(result.removed).toEqual([]);
    });
  });

  describe("groupPermissionsByResource", () => {
    test("権限をリソースタイプ別に正しくグループ化する", () => {
      const result = groupPermissionsByResource(samplePermissions);
      
      expect(result[ResourceType.GROUP]).toEqual([
        PermissionAction.READ,
        PermissionAction.CREATE,
      ]);
      
      expect(result[ResourceType.MEMBER]).toEqual([
        PermissionAction.READ,
      ]);
      
      expect(result[ResourceType.ROLE]).toEqual([
        PermissionAction.MANAGE,
      ]);
      
      expect(result[ResourceType.MCP_SERVER_CONFIG]).toEqual([]);
    });
  });

  describe("PERMISSION_SETS", () => {
    test("ADMIN 権限セットは全てのリソースと全てのアクションを含む", () => {
      const adminPermissions = PERMISSION_SETS.ADMIN;
      
      // 全てのリソースタイプが含まれているかチェック
      for (const resourceType of Object.values(ResourceType)) {
        expect(adminPermissions.some(p => p.resourceType === resourceType)).toBe(true);
      }
      
      // 全てのアクションが含まれているかチェック  
      for (const action of Object.values(PermissionAction)) {
        expect(adminPermissions.some(p => p.action === action)).toBe(true);
      }
    });

    test("READ_ONLY 権限セットは読み取り権限のみを含む", () => {
      const readOnlyPermissions = PERMISSION_SETS.READ_ONLY;
      
      // 全ての権限がREADアクションであることをチェック
      expect(readOnlyPermissions.every(p => p.action === PermissionAction.READ)).toBe(true);
      
      // 全てのリソースタイプのREAD権限が含まれているかチェック
      expect(readOnlyPermissions.length).toBe(Object.values(ResourceType).length);
    });

    test("EDITOR 権限セットは管理権限を含まない", () => {
      const editorPermissions = PERMISSION_SETS.EDITOR;
      
      // MANAGE権限が含まれていないことをチェック
      expect(editorPermissions.some(p => p.action === PermissionAction.MANAGE)).toBe(false);
    });

    test("DEVELOPER 権限セットはMCP関連のリソースに集中している", () => {
      const developerPermissions = PERMISSION_SETS.DEVELOPER;
      
      // MCP関連リソースの権限が含まれていることをチェック
      expect(developerPermissions.some(p => p.resourceType === ResourceType.MCP_SERVER_CONFIG)).toBe(true);
      expect(developerPermissions.some(p => p.resourceType === ResourceType.MCP_SERVER_INSTANCE)).toBe(true);
      expect(developerPermissions.some(p => p.resourceType === ResourceType.TOOL_GROUP)).toBe(true);
    });
  });
});
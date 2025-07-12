import { describe, test, expect } from "vitest";
import { PermissionAction, ResourceType } from "@tumiki/db";
import {
  getActionDisplayName,
  getResourceTypeDisplayName,
  getAvailableActions,
  isActionAvailable,
  validatePermissionCombination,
  calculateInheritedPermissions,
} from "@/lib/resourcePermissions";

describe("resourcePermissions ユーティリティ", () => {
  test("アクション表示名を正しく取得できる", () => {
    expect(getActionDisplayName(PermissionAction.CREATE)).toBe("作成");
    expect(getActionDisplayName(PermissionAction.READ)).toBe("読み取り");
    expect(getActionDisplayName(PermissionAction.UPDATE)).toBe("編集");
    expect(getActionDisplayName(PermissionAction.DELETE)).toBe("削除");
    expect(getActionDisplayName(PermissionAction.MANAGE)).toBe("管理");
  });

  test("リソースタイプ表示名を正しく取得できる", () => {
    expect(getResourceTypeDisplayName(ResourceType.GROUP)).toBe("グループ");
    expect(getResourceTypeDisplayName(ResourceType.MEMBER)).toBe("メンバー");
    expect(getResourceTypeDisplayName(ResourceType.ROLE)).toBe("ロール");
    expect(getResourceTypeDisplayName(ResourceType.MCP_SERVER_CONFIG)).toBe("MCPサーバー設定");
    expect(getResourceTypeDisplayName(ResourceType.TOOL_GROUP)).toBe("ツールグループ");
    expect(getResourceTypeDisplayName(ResourceType.MCP_SERVER_INSTANCE)).toBe("MCPサーバーインスタンス");
  });

  test("リソースタイプに対して利用可能なアクションを取得できる", () => {
    const groupActions = getAvailableActions(ResourceType.GROUP);
    expect(groupActions).toContain(PermissionAction.CREATE);
    expect(groupActions).toContain(PermissionAction.READ);
    expect(groupActions).toContain(PermissionAction.UPDATE);
    expect(groupActions).toContain(PermissionAction.DELETE);
    expect(groupActions).toContain(PermissionAction.MANAGE);

    const memberActions = getAvailableActions(ResourceType.MEMBER);
    expect(memberActions).toContain(PermissionAction.READ);
    expect(memberActions).toContain(PermissionAction.UPDATE);
    expect(memberActions).toContain(PermissionAction.DELETE);
    expect(memberActions).toContain(PermissionAction.MANAGE);
    expect(memberActions).not.toContain(PermissionAction.CREATE);
  });

  test("アクションが指定されたリソースタイプで利用可能かチェックできる", () => {
    expect(isActionAvailable(ResourceType.GROUP, PermissionAction.CREATE)).toBe(true);
    expect(isActionAvailable(ResourceType.MEMBER, PermissionAction.CREATE)).toBe(false);
  });

  test("権限の組み合わせを検証できる", () => {
    // 競合なし
    const validResult = validatePermissionCombination(
      [PermissionAction.READ, PermissionAction.UPDATE],
      [PermissionAction.DELETE]
    );
    expect(validResult.isValid).toBe(true);
    expect(validResult.conflicts).toStrictEqual([]);

    // 競合あり
    const invalidResult = validatePermissionCombination(
      [PermissionAction.READ, PermissionAction.UPDATE],
      [PermissionAction.READ, PermissionAction.DELETE]
    );
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.conflicts).toStrictEqual([PermissionAction.READ]);
  });

  test("権限の継承関係を計算できる", () => {
    const result = calculateInheritedPermissions(
      [PermissionAction.READ], // 直接権限
      [PermissionAction.UPDATE], // ロール権限
      [PermissionAction.CREATE], // グループ権限
      [PermissionAction.DELETE] // 拒否権限
    );

    expect(result.effective).toStrictEqual([
      PermissionAction.READ,
      PermissionAction.UPDATE,
      PermissionAction.CREATE,
    ]);
    expect(result.inherited).toStrictEqual([
      PermissionAction.UPDATE,
      PermissionAction.CREATE,
    ]);
    expect(result.denied).toStrictEqual([PermissionAction.DELETE]);
  });

  test("拒否権限が正しく除外される", () => {
    const result = calculateInheritedPermissions(
      [PermissionAction.READ],
      [PermissionAction.UPDATE],
      [PermissionAction.CREATE],
      [PermissionAction.READ, PermissionAction.UPDATE] // 拒否
    );

    expect(result.effective).toStrictEqual([PermissionAction.CREATE]);
    expect(result.inherited).toStrictEqual([PermissionAction.CREATE]);
    expect(result.denied).toStrictEqual([PermissionAction.READ, PermissionAction.UPDATE]);
  });
});
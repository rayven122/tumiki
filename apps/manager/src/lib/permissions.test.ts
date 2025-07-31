import { describe, test, expect } from "vitest";
import {
  PERMISSION_ACTIONS,
  RESOURCE_TYPES,
  PERMISSION_LABELS,
  RESOURCE_TYPE_LABELS,
  checkPermission,
  hasManagePermission,
  getPermissionMatrix,
  getAllPermissions,
  type Permission,
  type PermissionAction,
  type ResourceType,
  type RoleWithPermissions,
} from "./permissions";

describe("PERMISSION_ACTIONS", () => {
  test("正常系: 全ての権限アクションが定義されている", () => {
    expect(PERMISSION_ACTIONS).toStrictEqual({
      CREATE: "CREATE",
      READ: "READ",
      UPDATE: "UPDATE",
      DELETE: "DELETE",
      MANAGE: "MANAGE",
    });
  });

  test("正常系: as constによって読み取り専用になっている", () => {
    const actions = PERMISSION_ACTIONS;
    expect(actions.CREATE).toStrictEqual("CREATE");
    expect(actions.READ).toStrictEqual("READ");
    expect(actions.UPDATE).toStrictEqual("UPDATE");
    expect(actions.DELETE).toStrictEqual("DELETE");
    expect(actions.MANAGE).toStrictEqual("MANAGE");
  });
});

describe("RESOURCE_TYPES", () => {
  test("正常系: 全てのリソースタイプが定義されている", () => {
    expect(RESOURCE_TYPES).toStrictEqual({
      GROUP: "GROUP",
      MEMBER: "MEMBER",
      ROLE: "ROLE",
      MCP_SERVER_CONFIG: "MCP_SERVER_CONFIG",
      TOOL_GROUP: "TOOL_GROUP",
      MCP_SERVER_INSTANCE: "MCP_SERVER_INSTANCE",
    });
  });

  test("正常系: as constによって読み取り専用になっている", () => {
    const types = RESOURCE_TYPES;
    expect(types.GROUP).toStrictEqual("GROUP");
    expect(types.MEMBER).toStrictEqual("MEMBER");
    expect(types.ROLE).toStrictEqual("ROLE");
    expect(types.MCP_SERVER_CONFIG).toStrictEqual("MCP_SERVER_CONFIG");
    expect(types.TOOL_GROUP).toStrictEqual("TOOL_GROUP");
    expect(types.MCP_SERVER_INSTANCE).toStrictEqual("MCP_SERVER_INSTANCE");
  });
});

describe("PERMISSION_LABELS", () => {
  test("正常系: 全ての権限アクションに対する日本語ラベルが定義されている", () => {
    expect(PERMISSION_LABELS).toStrictEqual({
      CREATE: "作成",
      READ: "読み取り",
      UPDATE: "編集",
      DELETE: "削除",
      MANAGE: "管理",
    });
  });

  test("正常系: 各権限アクションのラベルが正しく取得できる", () => {
    expect(PERMISSION_LABELS[PERMISSION_ACTIONS.CREATE]).toStrictEqual("作成");
    expect(PERMISSION_LABELS[PERMISSION_ACTIONS.READ]).toStrictEqual(
      "読み取り",
    );
    expect(PERMISSION_LABELS[PERMISSION_ACTIONS.UPDATE]).toStrictEqual("編集");
    expect(PERMISSION_LABELS[PERMISSION_ACTIONS.DELETE]).toStrictEqual("削除");
    expect(PERMISSION_LABELS[PERMISSION_ACTIONS.MANAGE]).toStrictEqual("管理");
  });
});

describe("RESOURCE_TYPE_LABELS", () => {
  test("正常系: 全てのリソースタイプに対する日本語ラベルが定義されている", () => {
    expect(RESOURCE_TYPE_LABELS).toStrictEqual({
      GROUP: "グループ",
      MEMBER: "メンバー",
      ROLE: "ロール",
      MCP_SERVER_CONFIG: "MCPサーバー設定",
      TOOL_GROUP: "ツールグループ",
      MCP_SERVER_INSTANCE: "MCPサーバーインスタンス",
    });
  });

  test("正常系: 各リソースタイプのラベルが正しく取得できる", () => {
    expect(RESOURCE_TYPE_LABELS[RESOURCE_TYPES.GROUP]).toStrictEqual(
      "グループ",
    );
    expect(RESOURCE_TYPE_LABELS[RESOURCE_TYPES.MEMBER]).toStrictEqual(
      "メンバー",
    );
    expect(RESOURCE_TYPE_LABELS[RESOURCE_TYPES.ROLE]).toStrictEqual("ロール");
    expect(
      RESOURCE_TYPE_LABELS[RESOURCE_TYPES.MCP_SERVER_CONFIG],
    ).toStrictEqual("MCPサーバー設定");
    expect(RESOURCE_TYPE_LABELS[RESOURCE_TYPES.TOOL_GROUP]).toStrictEqual(
      "ツールグループ",
    );
    expect(
      RESOURCE_TYPE_LABELS[RESOURCE_TYPES.MCP_SERVER_INSTANCE],
    ).toStrictEqual("MCPサーバーインスタンス");
  });
});

describe("PermissionAction型", () => {
  test("正常系: PERMISSION_ACTIONSの値を型として使用できる", () => {
    const action: PermissionAction = "CREATE";
    expect(action).toStrictEqual("CREATE");
  });

  test("正常系: 全ての権限アクションが型として有効", () => {
    const actions: PermissionAction[] = [
      "CREATE",
      "READ",
      "UPDATE",
      "DELETE",
      "MANAGE",
    ];
    expect(actions).toStrictEqual([
      "CREATE",
      "READ",
      "UPDATE",
      "DELETE",
      "MANAGE",
    ]);
  });
});

describe("ResourceType型", () => {
  test("正常系: RESOURCE_TYPESの値を型として使用できる", () => {
    const type: ResourceType = "GROUP";
    expect(type).toStrictEqual("GROUP");
  });

  test("正常系: 全てのリソースタイプが型として有効", () => {
    const types: ResourceType[] = [
      "GROUP",
      "MEMBER",
      "ROLE",
      "MCP_SERVER_CONFIG",
      "TOOL_GROUP",
      "MCP_SERVER_INSTANCE",
    ];
    expect(types).toStrictEqual([
      "GROUP",
      "MEMBER",
      "ROLE",
      "MCP_SERVER_CONFIG",
      "TOOL_GROUP",
      "MCP_SERVER_INSTANCE",
    ]);
  });
});

describe("Permission型", () => {
  test("正常系: Permission型のオブジェクトを作成できる", () => {
    const permission: Permission = {
      resourceType: "GROUP",
      action: "CREATE",
    };
    expect(permission).toStrictEqual({
      resourceType: "GROUP",
      action: "CREATE",
    });
  });
});

describe("RoleWithPermissions型", () => {
  test("正常系: RoleWithPermissions型のオブジェクトを作成できる（全プロパティ）", () => {
    const role: RoleWithPermissions = {
      id: "role-1",
      name: "管理者",
      description: "システム管理者",
      isDefault: false,
      permissions: [
        { resourceType: "GROUP", action: "CREATE" },
        { resourceType: "MEMBER", action: "READ" },
      ],
      _count: {
        members: 5,
        groups: 3,
      },
    };
    expect(role).toStrictEqual({
      id: "role-1",
      name: "管理者",
      description: "システム管理者",
      isDefault: false,
      permissions: [
        { resourceType: "GROUP", action: "CREATE" },
        { resourceType: "MEMBER", action: "READ" },
      ],
      _count: {
        members: 5,
        groups: 3,
      },
    });
  });

  test("正常系: descriptionがnullの場合", () => {
    const role: RoleWithPermissions = {
      id: "role-2",
      name: "一般ユーザー",
      description: null,
      isDefault: true,
      permissions: [],
      _count: {
        members: 0,
        groups: 0,
      },
    };
    expect(role.description).toStrictEqual(null);
  });

  test("正常系: descriptionが省略された場合", () => {
    const role: RoleWithPermissions = {
      id: "role-3",
      name: "ゲスト",
      isDefault: false,
      permissions: [],
      _count: {
        members: 0,
        groups: 0,
      },
    };
    expect(role.description).toStrictEqual(undefined);
  });
});

describe("checkPermission", () => {
  test("正常系: 権限が存在する場合はtrueを返す", () => {
    const userPermissions: Permission[] = [
      { resourceType: "GROUP", action: "CREATE" },
      { resourceType: "MEMBER", action: "READ" },
    ];
    const requiredPermission: Permission = {
      resourceType: "GROUP",
      action: "CREATE",
    };
    expect(checkPermission(userPermissions, requiredPermission)).toStrictEqual(
      true,
    );
  });

  test("正常系: 権限が存在しない場合はfalseを返す", () => {
    const userPermissions: Permission[] = [
      { resourceType: "GROUP", action: "READ" },
      { resourceType: "MEMBER", action: "READ" },
    ];
    const requiredPermission: Permission = {
      resourceType: "GROUP",
      action: "CREATE",
    };
    expect(checkPermission(userPermissions, requiredPermission)).toStrictEqual(
      false,
    );
  });

  test("正常系: リソースタイプは一致するがアクションが異なる場合はfalseを返す", () => {
    const userPermissions: Permission[] = [
      { resourceType: "GROUP", action: "READ" },
    ];
    const requiredPermission: Permission = {
      resourceType: "GROUP",
      action: "CREATE",
    };
    expect(checkPermission(userPermissions, requiredPermission)).toStrictEqual(
      false,
    );
  });

  test("正常系: アクションは一致するがリソースタイプが異なる場合はfalseを返す", () => {
    const userPermissions: Permission[] = [
      { resourceType: "MEMBER", action: "CREATE" },
    ];
    const requiredPermission: Permission = {
      resourceType: "GROUP",
      action: "CREATE",
    };
    expect(checkPermission(userPermissions, requiredPermission)).toStrictEqual(
      false,
    );
  });

  test("境界値: 空の権限配列の場合はfalseを返す", () => {
    const userPermissions: Permission[] = [];
    const requiredPermission: Permission = {
      resourceType: "GROUP",
      action: "CREATE",
    };
    expect(checkPermission(userPermissions, requiredPermission)).toStrictEqual(
      false,
    );
  });

  test("正常系: 複数の権限から一致する権限を見つける", () => {
    const userPermissions: Permission[] = [
      { resourceType: "MEMBER", action: "UPDATE" },
      { resourceType: "ROLE", action: "READ" },
      { resourceType: "GROUP", action: "DELETE" },
      { resourceType: "TOOL_GROUP", action: "MANAGE" },
    ];
    const requiredPermission: Permission = {
      resourceType: "TOOL_GROUP",
      action: "MANAGE",
    };
    expect(checkPermission(userPermissions, requiredPermission)).toStrictEqual(
      true,
    );
  });
});

describe("hasManagePermission", () => {
  test("正常系: MANAGE権限が存在する場合はtrueを返す", () => {
    const userPermissions: Permission[] = [
      { resourceType: "GROUP", action: "CREATE" },
      { resourceType: "GROUP", action: "MANAGE" },
    ];
    expect(hasManagePermission(userPermissions, "GROUP")).toStrictEqual(true);
  });

  test("正常系: MANAGE権限が存在しない場合はfalseを返す", () => {
    const userPermissions: Permission[] = [
      { resourceType: "GROUP", action: "CREATE" },
      { resourceType: "GROUP", action: "READ" },
    ];
    expect(hasManagePermission(userPermissions, "GROUP")).toStrictEqual(false);
  });

  test("正常系: 異なるリソースタイプのMANAGE権限は無視される", () => {
    const userPermissions: Permission[] = [
      { resourceType: "MEMBER", action: "MANAGE" },
      { resourceType: "ROLE", action: "MANAGE" },
    ];
    expect(hasManagePermission(userPermissions, "GROUP")).toStrictEqual(false);
  });

  test("境界値: 空の権限配列の場合はfalseを返す", () => {
    const userPermissions: Permission[] = [];
    expect(hasManagePermission(userPermissions, "GROUP")).toStrictEqual(false);
  });

  test("正常系: 全てのリソースタイプでMANAGE権限をチェックできる", () => {
    const userPermissions: Permission[] = [
      { resourceType: "GROUP", action: "MANAGE" },
      { resourceType: "MEMBER", action: "MANAGE" },
      { resourceType: "ROLE", action: "MANAGE" },
      { resourceType: "MCP_SERVER_CONFIG", action: "MANAGE" },
      { resourceType: "TOOL_GROUP", action: "MANAGE" },
      { resourceType: "MCP_SERVER_INSTANCE", action: "MANAGE" },
    ];
    expect(hasManagePermission(userPermissions, "GROUP")).toStrictEqual(true);
    expect(hasManagePermission(userPermissions, "MEMBER")).toStrictEqual(true);
    expect(hasManagePermission(userPermissions, "ROLE")).toStrictEqual(true);
    expect(
      hasManagePermission(userPermissions, "MCP_SERVER_CONFIG"),
    ).toStrictEqual(true);
    expect(hasManagePermission(userPermissions, "TOOL_GROUP")).toStrictEqual(
      true,
    );
    expect(
      hasManagePermission(userPermissions, "MCP_SERVER_INSTANCE"),
    ).toStrictEqual(true);
  });
});

describe("getPermissionMatrix", () => {
  test("正常系: 権限マトリクスが正しく返される", () => {
    const matrix = getPermissionMatrix();
    expect(matrix).toStrictEqual({
      GROUP: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"],
      MEMBER: ["READ", "UPDATE", "DELETE", "MANAGE"],
      ROLE: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"],
      MCP_SERVER_CONFIG: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"],
      TOOL_GROUP: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"],
      MCP_SERVER_INSTANCE: ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"],
    });
  });

  test("正常系: MEMBERリソースにはCREATE権限がない", () => {
    const matrix = getPermissionMatrix();
    expect(matrix.MEMBER).toStrictEqual(["READ", "UPDATE", "DELETE", "MANAGE"]);
    expect(matrix.MEMBER.includes("CREATE" as PermissionAction)).toStrictEqual(
      false,
    );
  });

  test("正常系: GROUP、ROLE、MCP_SERVER_CONFIG、TOOL_GROUP、MCP_SERVER_INSTANCEには全権限がある", () => {
    const matrix = getPermissionMatrix();
    const fullPermissions = ["CREATE", "READ", "UPDATE", "DELETE", "MANAGE"];
    expect(matrix.GROUP).toStrictEqual(fullPermissions);
    expect(matrix.ROLE).toStrictEqual(fullPermissions);
    expect(matrix.MCP_SERVER_CONFIG).toStrictEqual(fullPermissions);
    expect(matrix.TOOL_GROUP).toStrictEqual(fullPermissions);
    expect(matrix.MCP_SERVER_INSTANCE).toStrictEqual(fullPermissions);
  });

  test("正常系: 全てのリソースタイプが定義されている", () => {
    const matrix = getPermissionMatrix();
    const resourceTypes = Object.keys(matrix);
    expect(resourceTypes).toStrictEqual([
      "GROUP",
      "MEMBER",
      "ROLE",
      "MCP_SERVER_CONFIG",
      "TOOL_GROUP",
      "MCP_SERVER_INSTANCE",
    ]);
  });
});

describe("getAllPermissions", () => {
  test("正常系: 全ての権限の組み合わせが返される", () => {
    const permissions = getAllPermissions();

    // 合計権限数の確認: GROUP(5) + MEMBER(4) + ROLE(5) + MCP_SERVER_CONFIG(5) + TOOL_GROUP(5) + MCP_SERVER_INSTANCE(5) = 29
    expect(permissions.length).toStrictEqual(29);
  });

  test("正常系: GROUPの全権限が含まれている", () => {
    const permissions = getAllPermissions();
    const groupPermissions = permissions.filter(
      (p) => p.resourceType === "GROUP",
    );
    expect(groupPermissions).toStrictEqual([
      { resourceType: "GROUP", action: "CREATE" },
      { resourceType: "GROUP", action: "READ" },
      { resourceType: "GROUP", action: "UPDATE" },
      { resourceType: "GROUP", action: "DELETE" },
      { resourceType: "GROUP", action: "MANAGE" },
    ]);
  });

  test("正常系: MEMBERの権限にCREATEが含まれていない", () => {
    const permissions = getAllPermissions();
    const memberPermissions = permissions.filter(
      (p) => p.resourceType === "MEMBER",
    );
    expect(memberPermissions).toStrictEqual([
      { resourceType: "MEMBER", action: "READ" },
      { resourceType: "MEMBER", action: "UPDATE" },
      { resourceType: "MEMBER", action: "DELETE" },
      { resourceType: "MEMBER", action: "MANAGE" },
    ]);
  });

  test("正常系: 全てのリソースタイプの権限が含まれている", () => {
    const permissions = getAllPermissions();
    const resourceTypes = [...new Set(permissions.map((p) => p.resourceType))];
    expect(resourceTypes.sort()).toStrictEqual([
      "GROUP",
      "MCP_SERVER_CONFIG",
      "MCP_SERVER_INSTANCE",
      "MEMBER",
      "ROLE",
      "TOOL_GROUP",
    ]);
  });

  test("正常系: 権限の順序が一定である", () => {
    const permissions1 = getAllPermissions();
    const permissions2 = getAllPermissions();
    expect(permissions1).toStrictEqual(permissions2);
  });

  test("正常系: 各リソースタイプの権限が正しい順序で返される", () => {
    const permissions = getAllPermissions();

    // ROLEの権限を確認
    const rolePermissions = permissions.filter(
      (p) => p.resourceType === "ROLE",
    );
    expect(rolePermissions).toStrictEqual([
      { resourceType: "ROLE", action: "CREATE" },
      { resourceType: "ROLE", action: "READ" },
      { resourceType: "ROLE", action: "UPDATE" },
      { resourceType: "ROLE", action: "DELETE" },
      { resourceType: "ROLE", action: "MANAGE" },
    ]);

    // MCP_SERVER_CONFIGの権限を確認
    const mcpServerConfigPermissions = permissions.filter(
      (p) => p.resourceType === "MCP_SERVER_CONFIG",
    );
    expect(mcpServerConfigPermissions).toStrictEqual([
      { resourceType: "MCP_SERVER_CONFIG", action: "CREATE" },
      { resourceType: "MCP_SERVER_CONFIG", action: "READ" },
      { resourceType: "MCP_SERVER_CONFIG", action: "UPDATE" },
      { resourceType: "MCP_SERVER_CONFIG", action: "DELETE" },
      { resourceType: "MCP_SERVER_CONFIG", action: "MANAGE" },
    ]);

    // TOOL_GROUPの権限を確認
    const toolGroupPermissions = permissions.filter(
      (p) => p.resourceType === "TOOL_GROUP",
    );
    expect(toolGroupPermissions).toStrictEqual([
      { resourceType: "TOOL_GROUP", action: "CREATE" },
      { resourceType: "TOOL_GROUP", action: "READ" },
      { resourceType: "TOOL_GROUP", action: "UPDATE" },
      { resourceType: "TOOL_GROUP", action: "DELETE" },
      { resourceType: "TOOL_GROUP", action: "MANAGE" },
    ]);

    // MCP_SERVER_INSTANCEの権限を確認
    const mcpServerInstancePermissions = permissions.filter(
      (p) => p.resourceType === "MCP_SERVER_INSTANCE",
    );
    expect(mcpServerInstancePermissions).toStrictEqual([
      { resourceType: "MCP_SERVER_INSTANCE", action: "CREATE" },
      { resourceType: "MCP_SERVER_INSTANCE", action: "READ" },
      { resourceType: "MCP_SERVER_INSTANCE", action: "UPDATE" },
      { resourceType: "MCP_SERVER_INSTANCE", action: "DELETE" },
      { resourceType: "MCP_SERVER_INSTANCE", action: "MANAGE" },
    ]);
  });
});

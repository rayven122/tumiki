import { describe, test, expect } from "vitest";
import {
  // NextAuth関連のスキーマ
  AccountIdSchema,
  SessionIdSchema,
  UserIdSchema,
  VerificationTokenIdSchema,
  // McpServer関連のスキーマ
  McpServerIdSchema,
  ToolIdSchema,
  // UserMcpServer関連のスキーマ
  UserMcpServerConfigIdSchema,
  UserToolGroupIdSchema,
  UserMcpServerInstanceIdSchema,
  // APIキー関連のスキーマ
  ApiKeyIdSchema,
  // Organization関連のスキーマ
  OrganizationIdSchema,
  OrganizationMemberIdSchema,
  OrganizationInvitationIdSchema,
  OrganizationGroupIdSchema,
  OrganizationRoleIdSchema,
  RolePermissionIdSchema,
  ResourceAccessControlIdSchema,
  // 型のインポート
  type AccountId,
  type SessionId,
  type UserId,
  type VerificationTokenId,
  type McpServerId,
  type ToolId,
  type UserMcpServerConfigId,
  type UserToolGroupId,
  type UserMcpServerInstanceId,
  type ApiKeyId,
  type OrganizationId,
  type OrganizationMemberId,
  type OrganizationInvitationId,
  type OrganizationGroupId,
  type OrganizationRoleId,
  type RolePermissionId,
  type ResourceAccessControlId,
} from "./ids";

describe("AccountIdSchema", () => {
  test("正常系: 有効な文字列を受け入れる", () => {
    const validId = "acc_123456789";
    const result = AccountIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // ブランド型であることを確認
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies AccountId;
  });

  test("正常系: 空文字列を受け入れる", () => {
    const result = AccountIdSchema.parse("");
    expect(result).toStrictEqual("");
  });

  test("異常系: 数値を拒否する", () => {
    expect(() => AccountIdSchema.parse(123)).toThrow();
  });

  test("異常系: nullを拒否する", () => {
    expect(() => AccountIdSchema.parse(null)).toThrow();
  });

  test("異常系: undefinedを拒否する", () => {
    expect(() => AccountIdSchema.parse(undefined)).toThrow();
  });

  test("異常系: オブジェクトを拒否する", () => {
    expect(() => AccountIdSchema.parse({})).toThrow();
  });

  test("異常系: 配列を拒否する", () => {
    expect(() => AccountIdSchema.parse([])).toThrow();
  });
});

describe("SessionIdSchema", () => {
  test("正常系: 有効な文字列を受け入れる", () => {
    const validId = "sess_abcdef123456";
    const result = SessionIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies SessionId;
  });

  test("正常系: UUID形式の文字列を受け入れる", () => {
    const validId = "550e8400-e29b-41d4-a716-446655440000";
    const result = SessionIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
  });

  test("異常系: 真偽値を拒否する", () => {
    expect(() => SessionIdSchema.parse(true)).toThrow();
  });
});

describe("UserIdSchema", () => {
  test("正常系: 有効な文字列を受け入れる", () => {
    const validId = "user_123";
    const result = UserIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies UserId;
  });

  test("正常系: Auth0形式のIDを受け入れる", () => {
    const validId = "auth0|507f1f77bcf86cd799439011";
    const result = UserIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
  });

  test("異常系: 数値型を拒否する", () => {
    expect(() => UserIdSchema.parse(456)).toThrow();
  });
});

describe("VerificationTokenIdSchema", () => {
  test("正常系: 有効な文字列を受け入れる", () => {
    const validId = "token_verification_123";
    const result = VerificationTokenIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies VerificationTokenId;
  });

  test("正常系: ランダムな文字列を受け入れる", () => {
    const validId = "xYz123ABC";
    const result = VerificationTokenIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
  });

  test("異常系: シンボルを拒否する", () => {
    expect(() => VerificationTokenIdSchema.parse(Symbol("test"))).toThrow();
  });
});

describe("McpServerIdSchema", () => {
  test("正常系: 有効な文字列を受け入れる", () => {
    const validId = "mcp_server_001";
    const result = McpServerIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies McpServerId;
  });

  test("正常系: ハイフン付きIDを受け入れる", () => {
    const validId = "mcp-server-prod-001";
    const result = McpServerIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
  });

  test("異常系: NaNを拒否する", () => {
    expect(() => McpServerIdSchema.parse(NaN)).toThrow();
  });
});

describe("ToolIdSchema", () => {
  test("正常系: 有効な文字列を受け入れる", () => {
    const validId = "tool_hammer_v1";
    const result = ToolIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies ToolId;
  });

  test("正常系: アンダースコア区切りのIDを受け入れる", () => {
    const validId = "tool_category_subcategory_name";
    const result = ToolIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
  });

  test("異常系: Infinityを拒否する", () => {
    expect(() => ToolIdSchema.parse(Infinity)).toThrow();
  });
});

describe("UserMcpServerConfigIdSchema", () => {
  test("正常系: 有効な文字列を受け入れる", () => {
    const validId = "config_user123_server456";
    const result = UserMcpServerConfigIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies UserMcpServerConfigId;
  });

  test("正常系: CUID形式の文字列を受け入れる", () => {
    const validId = "clh1234567890abcdefghijk";
    const result = UserMcpServerConfigIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
  });

  test("異常系: 関数を拒否する", () => {
    expect(() =>
      UserMcpServerConfigIdSchema.parse(() => {
        // Empty function for testing
      }),
    ).toThrow();
  });
});

describe("UserToolGroupIdSchema", () => {
  test("正常系: 有効な文字列を受け入れる", () => {
    const validId = "group_tools_admin";
    const result = UserToolGroupIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies UserToolGroupId;
  });

  test("正常系: 数字を含むIDを受け入れる", () => {
    const validId = "group123";
    const result = UserToolGroupIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
  });

  test("異常系: Dateオブジェクトを拒否する", () => {
    expect(() => UserToolGroupIdSchema.parse(new Date())).toThrow();
  });
});

describe("UserMcpServerInstanceIdSchema", () => {
  test("正常系: 有効な文字列を受け入れる", () => {
    const validId = "instance_abc123";
    const result = UserMcpServerInstanceIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies UserMcpServerInstanceId;
  });

  test("正常系: タイムスタンプ付きIDを受け入れる", () => {
    const validId = "instance_20240101_123456";
    const result = UserMcpServerInstanceIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
  });

  test("異常系: RegExpオブジェクトを拒否する", () => {
    expect(() => UserMcpServerInstanceIdSchema.parse(/test/)).toThrow();
  });
});

describe("ApiKeyIdSchema", () => {
  test("正常系: 有効な文字列を受け入れる", () => {
    const validId = "apikey_1234567890";
    const result = ApiKeyIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies ApiKeyId;
  });

  test("正常系: プレフィックス付きキーを受け入れる", () => {
    const validId = "sk_live_abcdefghijk";
    const result = ApiKeyIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
  });

  test("異常系: Mapオブジェクトを拒否する", () => {
    expect(() => ApiKeyIdSchema.parse(new Map())).toThrow();
  });
});

describe("OrganizationIdSchema", () => {
  test("正常系: 有効なCUID形式の文字列を受け入れる", () => {
    const validId = "clh3m5qjy0000356tmf0l69b8";
    const result = OrganizationIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies OrganizationId;
  });

  test("異常系: 無効なCUID形式の文字列を拒否する", () => {
    expect(() => OrganizationIdSchema.parse("invalid-cuid")).toThrow(
      "有効な組織IDを入力してください",
    );
  });

  test("異常系: 空文字列を拒否する", () => {
    expect(() => OrganizationIdSchema.parse("")).toThrow(
      "有効な組織IDを入力してください",
    );
  });

  test("異常系: 数値を拒否する", () => {
    expect(() => OrganizationIdSchema.parse(123)).toThrow();
  });

  test("異常系: UUID形式を拒否する", () => {
    expect(() =>
      OrganizationIdSchema.parse("550e8400-e29b-41d4-a716-446655440000"),
    ).toThrow("有効な組織IDを入力してください");
  });
});

describe("OrganizationMemberIdSchema", () => {
  test("正常系: 有効な文字列を受け入れる", () => {
    const validId = "member_org123_user456";
    const result = OrganizationMemberIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies OrganizationMemberId;
  });

  test("正常系: CUID形式の文字列を受け入れる", () => {
    const validId = "clh3m5qjy0000356tmf0l69b9";
    const result = OrganizationMemberIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
  });

  test("異常系: Setオブジェクトを拒否する", () => {
    expect(() => OrganizationMemberIdSchema.parse(new Set())).toThrow();
  });
});

describe("OrganizationInvitationIdSchema", () => {
  test("正常系: 有効な文字列を受け入れる", () => {
    const validId = "invite_abc123xyz";
    const result = OrganizationInvitationIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies OrganizationInvitationId;
  });

  test("正常系: ランダムな文字列を受け入れる", () => {
    const validId = "XyZ9876543210";
    const result = OrganizationInvitationIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
  });

  test("異常系: WeakMapオブジェクトを拒否する", () => {
    expect(() => OrganizationInvitationIdSchema.parse(new WeakMap())).toThrow();
  });
});

describe("OrganizationGroupIdSchema", () => {
  test("正常系: 有効な文字列を受け入れる", () => {
    const validId = "group_admins";
    const result = OrganizationGroupIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies OrganizationGroupId;
  });

  test("正常系: 階層的なグループIDを受け入れる", () => {
    const validId = "org.dept.team.subteam";
    const result = OrganizationGroupIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
  });

  test("異常系: Promiseオブジェクトを拒否する", () => {
    expect(() =>
      OrganizationGroupIdSchema.parse(Promise.resolve("test")),
    ).toThrow();
  });
});

describe("OrganizationRoleIdSchema", () => {
  test("正常系: 有効な文字列を受け入れる", () => {
    const validId = "role_admin";
    const result = OrganizationRoleIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies OrganizationRoleId;
  });

  test("正常系: カスタムロールIDを受け入れる", () => {
    const validId = "custom_role_developer_level2";
    const result = OrganizationRoleIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
  });

  test("異常系: Errorオブジェクトを拒否する", () => {
    expect(() => OrganizationRoleIdSchema.parse(new Error("test"))).toThrow();
  });
});

describe("RolePermissionIdSchema", () => {
  test("正常系: 有効な文字列を受け入れる", () => {
    const validId = "perm_read_users";
    const result = RolePermissionIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies RolePermissionId;
  });

  test("正常系: ドット区切りの権限IDを受け入れる", () => {
    const validId = "app.module.action.create";
    const result = RolePermissionIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
  });

  test("異常系: ArrayBufferを拒否する", () => {
    expect(() => RolePermissionIdSchema.parse(new ArrayBuffer(8))).toThrow();
  });
});

describe("ResourceAccessControlIdSchema", () => {
  test("正常系: 有効な文字列を受け入れる", () => {
    const validId = "rac_resource123_user456";
    const result = ResourceAccessControlIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void result satisfies ResourceAccessControlId;
  });

  test("正常系: UUID形式のIDを受け入れる", () => {
    const validId = "123e4567-e89b-12d3-a456-426614174000";
    const result = ResourceAccessControlIdSchema.parse(validId);
    expect(result).toStrictEqual(validId);
  });

  test("異常系: Int8Arrayを拒否する", () => {
    expect(() =>
      ResourceAccessControlIdSchema.parse(new Int8Array([1, 2, 3])),
    ).toThrow();
  });
});

describe("ブランド型の動作確認", () => {
  test("異なるブランド型は相互に代入できない", () => {
    const userId = UserIdSchema.parse("user_123");
    const accountId = AccountIdSchema.parse("account_123");

    // TypeScriptの型チェックで以下はコンパイルエラーになる
    // const _wrongAssignment: AccountId = userId; // エラー
    // const _wrongAssignment2: UserId = accountId; // エラー

    // 実行時の値は同じ文字列
    expect(typeof userId).toStrictEqual("string");
    expect(typeof accountId).toStrictEqual("string");
  });

  test("同じブランド型は代入可能", () => {
    const userId1 = UserIdSchema.parse("user_123");
    const userId2 = UserIdSchema.parse("user_456");

    // TypeScriptの型チェックで問題ない
    // 型チェック（変数は使用されないが、型の互換性を確認）
    void userId1 satisfies UserId;
    void userId2 satisfies UserId;

    expect(userId1).toStrictEqual("user_123");
    expect(userId2).toStrictEqual("user_456");
  });
});

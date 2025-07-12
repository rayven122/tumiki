import { describe, expect, test } from "bun:test";
import {
  GetByOrganizationInput,
  AddMemberInput,
  RemoveMemberInput,
  ToggleAdminInput,
  UpdateRoleInput,
  BulkUpdateInput,
} from "./index";

describe("organizationMember schema validation", () => {
  describe("GetByOrganizationInput", () => {
    test("必須フィールドが正しく検証される", () => {
      const validInput = {
        organizationId: "org123",
      };
      expect(() => GetByOrganizationInput.parse(validInput)).not.toThrow();
    });

    test("オプションフィールドが正しく処理される", () => {
      const inputWithOptionals = {
        organizationId: "org123",
        search: "test user",
        roles: ["role1", "role2"],
        groups: ["group1"],
        isAdmin: true,
      };
      const parsed = GetByOrganizationInput.parse(inputWithOptionals);
      expect(parsed).toStrictEqual(inputWithOptionals);
    });

    test("organizationIdが空の場合エラーが発生する", () => {
      const invalidInput = {
        organizationId: "",
      };
      expect(() => GetByOrganizationInput.parse(invalidInput)).toThrow();
    });
  });

  describe("AddMemberInput", () => {
    test("必須フィールドが正しく検証される", () => {
      const validInput = {
        organizationId: "org123",
        userId: "user123",
      };
      const parsed = AddMemberInput.parse(validInput);
      expect(parsed.organizationId).toStrictEqual("org123");
      expect(parsed.userId).toStrictEqual("user123");
      expect(parsed.isAdmin).toStrictEqual(false); // デフォルト値
      expect(parsed.roleIds).toStrictEqual([]); // デフォルト値
      expect(parsed.groupIds).toStrictEqual([]); // デフォルト値
    });

    test("オプションフィールドが正しく処理される", () => {
      const inputWithOptionals = {
        organizationId: "org123",
        userId: "user123",
        isAdmin: true,
        roleIds: ["role1", "role2"],
        groupIds: ["group1"],
      };
      const parsed = AddMemberInput.parse(inputWithOptionals);
      expect(parsed).toStrictEqual(inputWithOptionals);
    });

    test("必須フィールドが欠けている場合エラーが発生する", () => {
      const invalidInput = {
        organizationId: "org123",
        // userId が欠けている
      };
      expect(() => AddMemberInput.parse(invalidInput)).toThrow();
    });
  });

  describe("RemoveMemberInput", () => {
    test("正しい入力で検証が通る", () => {
      const validInput = {
        organizationId: "org123",
        memberId: "member123",
      };
      expect(() => RemoveMemberInput.parse(validInput)).not.toThrow();
    });

    test("空のフィールドでエラーが発生する", () => {
      const invalidInput = {
        organizationId: "",
        memberId: "member123",
      };
      expect(() => RemoveMemberInput.parse(invalidInput)).toThrow();
    });
  });

  describe("ToggleAdminInput", () => {
    test("正しい入力で検証が通る", () => {
      const validInput = {
        organizationId: "org123",
        memberId: "member123",
      };
      expect(() => ToggleAdminInput.parse(validInput)).not.toThrow();
    });
  });

  describe("UpdateRoleInput", () => {
    test("必須フィールドのみで検証が通る", () => {
      const validInput = {
        organizationId: "org123",
        memberId: "member123",
      };
      expect(() => UpdateRoleInput.parse(validInput)).not.toThrow();
    });

    test("オプションフィールドが正しく処理される", () => {
      const inputWithOptionals = {
        organizationId: "org123",
        memberId: "member123",
        roleIds: ["role1", "role2"],
        groupIds: ["group1", "group2"],
      };
      const parsed = UpdateRoleInput.parse(inputWithOptionals);
      expect(parsed).toStrictEqual(inputWithOptionals);
    });
  });

  describe("BulkUpdateInput", () => {
    test("DELETE アクションで検証が通る", () => {
      const validInput = {
        organizationId: "org123",
        memberIds: ["member1", "member2"],
        action: "DELETE" as const,
      };
      expect(() => BulkUpdateInput.parse(validInput)).not.toThrow();
    });

    test("UPDATE_ROLES アクションで検証が通る", () => {
      const validInput = {
        organizationId: "org123",
        memberIds: ["member1", "member2"],
        action: "UPDATE_ROLES" as const,
        roleIds: ["role1", "role2"],
      };
      expect(() => BulkUpdateInput.parse(validInput)).not.toThrow();
    });

    test("UPDATE_ADMIN アクションで検証が通る", () => {
      const validInput = {
        organizationId: "org123",
        memberIds: ["member1"],
        action: "UPDATE_ADMIN" as const,
        isAdmin: true,
      };
      expect(() => BulkUpdateInput.parse(validInput)).not.toThrow();
    });

    test("無効なアクションでエラーが発生する", () => {
      const invalidInput = {
        organizationId: "org123",
        memberIds: ["member1"],
        action: "INVALID_ACTION",
      };
      expect(() => BulkUpdateInput.parse(invalidInput)).toThrow();
    });

    test("空のmemberIdsでエラーが発生する", () => {
      const invalidInput = {
        organizationId: "org123",
        memberIds: [],
        action: "DELETE" as const,
      };
      expect(() => BulkUpdateInput.parse(invalidInput)).toThrow();
    });
  });
});
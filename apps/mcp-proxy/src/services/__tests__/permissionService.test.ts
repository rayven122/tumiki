/**
 * Unit tests for services/permissionService.ts
 *
 * 権限チェックサービスのテスト
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { checkPermission } from "../permissionService.js";

describe("checkPermission", () => {
  describe("組織IDの比較", () => {
    test("同じ組織IDの場合はtrueを返す", async () => {
      const organizationId = "org-123";

      const result = await checkPermission(
        organizationId,
        organizationId,
        "MCP_SERVER_INSTANCE",
        "READ",
        "instance-456",
      );

      expect(result).toBe(true);
    });

    test("異なる組織IDの場合はfalseを返す", async () => {
      const result = await checkPermission(
        "org-123",
        "org-456",
        "MCP_SERVER_INSTANCE",
        "READ",
        "instance-789",
      );

      expect(result).toBe(false);
    });

    test("空文字列同士の場合はtrueを返す", async () => {
      const result = await checkPermission(
        "",
        "",
        "MCP_SERVER_INSTANCE",
        "READ",
      );

      expect(result).toBe(true);
    });

    test("空文字列と非空文字列の場合はfalseを返す", async () => {
      const result = await checkPermission(
        "",
        "org-123",
        "MCP_SERVER_INSTANCE",
        "READ",
      );

      expect(result).toBe(false);
    });
  });

  describe("リソースタイプとアクションの扱い", () => {
    test("任意のリソースタイプで組織ID比較が適用される", async () => {
      const resourceTypes = [
        "MCP_SERVER_INSTANCE",
        "MCP_SERVER_TEMPLATE",
        "ORGANIZATION",
        "USER",
        "",
      ];

      for (const resourceType of resourceTypes) {
        const resultSame = await checkPermission(
          "org-123",
          "org-123",
          resourceType,
          "READ",
        );
        expect(resultSame).toBe(true);

        const resultDifferent = await checkPermission(
          "org-123",
          "org-456",
          resourceType,
          "READ",
        );
        expect(resultDifferent).toBe(false);
      }
    });

    test("任意のアクションで組織ID比較が適用される", async () => {
      const actions = ["READ", "WRITE", "DELETE", "ADMIN", ""];

      for (const action of actions) {
        const resultSame = await checkPermission(
          "org-123",
          "org-123",
          "MCP_SERVER_INSTANCE",
          action,
        );
        expect(resultSame).toBe(true);

        const resultDifferent = await checkPermission(
          "org-123",
          "org-456",
          "MCP_SERVER_INSTANCE",
          action,
        );
        expect(resultDifferent).toBe(false);
      }
    });
  });

  describe("resourceIdの扱い", () => {
    test("resourceIdが指定されていても組織ID比較が適用される", async () => {
      const result = await checkPermission(
        "org-123",
        "org-123",
        "MCP_SERVER_INSTANCE",
        "READ",
        "instance-456",
      );

      expect(result).toBe(true);
    });

    test("resourceIdがundefinedでも組織ID比較が適用される", async () => {
      const result = await checkPermission(
        "org-123",
        "org-123",
        "MCP_SERVER_INSTANCE",
        "READ",
        undefined,
      );

      expect(result).toBe(true);
    });
  });

  describe("Property-Based Testing", () => {
    test("同じ組織IDは常にtrueを返す", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string(),
          fc.string(),
          fc.option(fc.string(), { nil: undefined }),
          async (orgId, resourceType, action, resourceId) => {
            const result = await checkPermission(
              orgId,
              orgId,
              resourceType,
              action,
              resourceId,
            );
            expect(result).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    test("異なる組織IDは常にfalseを返す", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          fc.string(),
          fc.string(),
          fc.option(fc.string(), { nil: undefined }),
          async (orgId1, orgId2, resourceType, action, resourceId) => {
            // 異なる組織IDを保証
            fc.pre(orgId1 !== orgId2);

            const result = await checkPermission(
              orgId1,
              orgId2,
              resourceType,
              action,
              resourceId,
            );
            expect(result).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    test("対称性: checkPermission(a, b) === checkPermission(b, a) は成り立たない（反射的）", async () => {
      // 現在の実装では userOrgId === targetOrgId の厳密な等価比較
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          async (orgId1, orgId2) => {
            fc.pre(orgId1 !== orgId2);

            const result1 = await checkPermission(
              orgId1,
              orgId2,
              "TEST",
              "READ",
            );
            const result2 = await checkPermission(
              orgId2,
              orgId1,
              "TEST",
              "READ",
            );

            // 両方ともfalseになる（異なる組織なので）
            expect(result1).toBe(false);
            expect(result2).toBe(false);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});

import { describe, test, expect } from "vitest";
import { McpServerVisibility } from "@tumiki/db/prisma";
import { buildAgentAccessCondition } from "../agentAccessCondition";

describe("buildAgentAccessCondition", () => {
  test("正しいアクセス条件を生成する", () => {
    const organizationId = "org-123";
    const userId = "user-456";

    const result = buildAgentAccessCondition(organizationId, userId);

    expect(result).toStrictEqual({
      OR: [
        {
          organizationId: "org-123",
          createdById: "user-456",
        },
        {
          organizationId: "org-123",
          visibility: McpServerVisibility.ORGANIZATION,
        },
      ],
    });
  });

  test("異なる組織IDとユーザーIDで正しい条件を生成する", () => {
    const organizationId = "org-789";
    const userId = "user-abc";

    const result = buildAgentAccessCondition(organizationId, userId);

    expect(result).toStrictEqual({
      OR: [
        {
          organizationId: "org-789",
          createdById: "user-abc",
        },
        {
          organizationId: "org-789",
          visibility: McpServerVisibility.ORGANIZATION,
        },
      ],
    });
  });

  test("空文字列のIDでも条件を生成する", () => {
    const organizationId = "";
    const userId = "";

    const result = buildAgentAccessCondition(organizationId, userId);

    expect(result).toStrictEqual({
      OR: [
        {
          organizationId: "",
          createdById: "",
        },
        {
          organizationId: "",
          visibility: McpServerVisibility.ORGANIZATION,
        },
      ],
    });
  });
});

import { beforeEach, describe, expect, test, vi } from "vitest";
import { validateOrganizationMembership } from "./membershipUtils.js";

// モック関数を定義
const mockCheckOrganizationMembership = vi.fn();

// mcpServerService をモック
vi.mock("../../services/mcpServerService.js", () => ({
  checkOrganizationMembership: (...args: unknown[]): unknown =>
    mockCheckOrganizationMembership(...args),
}));

// logger をモック
vi.mock("../logger/index.js", () => ({
  logError: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validateOrganizationMembership", () => {
  test("メンバーの場合はisMember=trueを返す", async () => {
    mockCheckOrganizationMembership.mockResolvedValueOnce(true);

    const result = await validateOrganizationMembership("org-123", "user-456");

    expect(result.isMember).toBe(true);
    expect(mockCheckOrganizationMembership).toHaveBeenCalledWith(
      "org-123",
      "user-456",
    );
  });

  test("メンバーでない場合はnot_a_memberエラーを返す", async () => {
    mockCheckOrganizationMembership.mockResolvedValueOnce(false);

    const result = await validateOrganizationMembership("org-123", "user-456");

    expect(result.isMember).toBe(false);
    if (!result.isMember) {
      expect(result.error).toBe("not_a_member");
    }
  });

  test("チェック中にエラーが発生した場合はcheck_failedエラーを返す", async () => {
    mockCheckOrganizationMembership.mockRejectedValueOnce(
      new Error("Database error"),
    );

    const result = await validateOrganizationMembership("org-123", "user-456");

    expect(result.isMember).toBe(false);
    if (!result.isMember) {
      expect(result.error).toBe("check_failed");
    }
  });
});

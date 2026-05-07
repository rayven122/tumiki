import { describe, expect, test } from "vitest";
import { tenantStatusBadgeClass } from "./tenantStyles";

describe("tenantStatusBadgeClass", () => {
  test("ACTIVE は成功バッジを返す", () => {
    expect(tenantStatusBadgeClass("ACTIVE")).toStrictEqual(
      "bg-badge-success-bg text-badge-success-text",
    );
  });

  test("ERROR はエラーバッジを返す", () => {
    expect(tenantStatusBadgeClass("ERROR")).toStrictEqual(
      "bg-badge-error-bg text-badge-error-text",
    );
  });

  test("処理中ステータスは警告バッジを返す", () => {
    expect(tenantStatusBadgeClass("DELETING")).toStrictEqual(
      "bg-badge-warn-bg text-badge-warn-text",
    );
    expect(tenantStatusBadgeClass("UPGRADING")).toStrictEqual(
      "bg-badge-warn-bg text-badge-warn-text",
    );
  });

  test("PROVISIONING は控えめなバッジを返す", () => {
    expect(tenantStatusBadgeClass("PROVISIONING")).toStrictEqual(
      "bg-bg-active text-text-muted",
    );
  });
});

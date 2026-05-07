import { describe, expect, test } from "vitest";
import { licenseStatusBadgeClass } from "./licenseStyles";

describe("licenseStatusBadgeClass", () => {
  test("ACTIVE は成功バッジを返す", () => {
    expect(licenseStatusBadgeClass("ACTIVE")).toStrictEqual(
      "bg-badge-success-bg text-badge-success-text",
    );
  });

  test("EXPIRED は警告バッジを返す", () => {
    expect(licenseStatusBadgeClass("EXPIRED")).toStrictEqual(
      "bg-badge-warn-bg text-badge-warn-text",
    );
  });

  test("REVOKED はエラーバッジを返す", () => {
    expect(licenseStatusBadgeClass("REVOKED")).toStrictEqual(
      "bg-badge-error-bg text-badge-error-text",
    );
  });
});

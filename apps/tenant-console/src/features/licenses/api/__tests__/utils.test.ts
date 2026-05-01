import { describe, expect, test } from "vitest";
import { computeStatus } from "../utils";

describe("computeStatus", () => {
  test("REVOKEDはexpiresAtに関わらずREVOKEDを返す", () => {
    expect(
      computeStatus({
        status: "REVOKED",
        expiresAt: new Date(Date.now() + 10000),
      }),
    ).toStrictEqual("REVOKED");
  });

  test("ACTIVE かつ expiresAt が過去の場合 EXPIRED を返す", () => {
    expect(
      computeStatus({
        status: "ACTIVE",
        expiresAt: new Date(Date.now() - 1),
      }),
    ).toStrictEqual("EXPIRED");
  });

  test("ACTIVE かつ expiresAt が未来の場合 ACTIVE を返す", () => {
    expect(
      computeStatus({
        status: "ACTIVE",
        expiresAt: new Date(Date.now() + 10000),
      }),
    ).toStrictEqual("ACTIVE");
  });

  test("REVOKED かつ expiresAt が過去の場合も REVOKED を返す（REVOKED が優先）", () => {
    expect(
      computeStatus({
        status: "REVOKED",
        expiresAt: new Date(Date.now() - 1),
      }),
    ).toStrictEqual("REVOKED");
  });
});

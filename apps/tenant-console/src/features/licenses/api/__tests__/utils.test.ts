import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { computeStatus } from "../utils";

const FIXED_NOW = new Date("2026-01-01T00:00:00.000Z");

describe("computeStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("REVOKEDはexpiresAtに関わらずREVOKEDを返す", () => {
    expect(
      computeStatus({
        status: "REVOKED",
        expiresAt: new Date("2026-01-02T00:00:00.000Z"),
      }),
    ).toStrictEqual("REVOKED");
  });

  test("ACTIVE かつ expiresAt が過去の場合 EXPIRED を返す", () => {
    expect(
      computeStatus({
        status: "ACTIVE",
        expiresAt: new Date("2025-12-31T23:59:59.999Z"),
      }),
    ).toStrictEqual("EXPIRED");
  });

  test("ACTIVE かつ expiresAt が未来の場合 ACTIVE を返す", () => {
    expect(
      computeStatus({
        status: "ACTIVE",
        expiresAt: new Date("2026-01-02T00:00:00.000Z"),
      }),
    ).toStrictEqual("ACTIVE");
  });

  test("REVOKED かつ expiresAt が過去でも REVOKED を返す（REVOKED が EXPIRED より優先）", () => {
    expect(
      computeStatus({
        status: "REVOKED",
        expiresAt: new Date("2025-12-31T23:59:59.999Z"),
      }),
    ).toStrictEqual("REVOKED");
  });
});

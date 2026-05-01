import { describe, expect, test } from "vitest";

import {
  SOURCE_SCIM_OKTA,
  TEST_TENANT_ID,
} from "../__tests__/fixtures/tenant-config.js";
import { externalId } from "../domain/branded.js";
import { canonicalizeEmail } from "../domain/email.js";
import { createPipelineContext } from "./context.js";
import {
  normalizeMembershipSnapshot,
  normalizeUserSnapshot,
  normalizeUserSnapshots,
} from "./normalizer.js";

describe("normalizeUserSnapshot", () => {
  test("active な user を UserUpserted に変換する", () => {
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    const result = normalizeUserSnapshot(ctx, {
      source: SOURCE_SCIM_OKTA,
      externalId: externalId("ext-1"),
      email: "User@Example.com",
      emailVerified: true,
      displayName: "User One",
      active: true,
      attributes: { dept: "eng" },
    });

    expect(result).toMatchObject({
      type: "UserUpserted",
      payload: {
        externalId: "ext-1",
        email: canonicalizeEmail("User@Example.com"),
        emailVerified: true,
        displayName: "User One",
        attributes: { dept: "eng" },
      },
    });
  });

  test("inactive な user を UserDeactivated に変換する", () => {
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    const result = normalizeUserSnapshot(ctx, {
      source: SOURCE_SCIM_OKTA,
      externalId: externalId("ext-1"),
      email: "user@example.com",
      emailVerified: true,
      displayName: "User One",
      active: false,
      attributes: {},
    });

    expect(result).toMatchObject({
      type: "UserDeactivated",
      payload: { externalId: "ext-1" },
    });
  });

  test("不正な email format は NormalizationError を返す", () => {
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    const result = normalizeUserSnapshot(ctx, {
      source: SOURCE_SCIM_OKTA,
      externalId: externalId("ext-1"),
      email: "not-an-email",
      emailVerified: true,
      displayName: "User One",
      active: true,
      attributes: {},
    });

    expect(result).toMatchObject({
      externalId: "ext-1",
    });
    if ("reason" in result) {
      expect(result.reason).toMatch(/invalid email/);
    }
  });
});

describe("normalizeUserSnapshots", () => {
  test("有効と無効を分離して返す", () => {
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    const result = normalizeUserSnapshots(ctx, [
      {
        source: SOURCE_SCIM_OKTA,
        externalId: externalId("ok"),
        email: "ok@example.com",
        emailVerified: true,
        displayName: "OK",
        active: true,
        attributes: {},
      },
      {
        source: SOURCE_SCIM_OKTA,
        externalId: externalId("ng"),
        email: "invalid",
        emailVerified: true,
        displayName: "NG",
        active: true,
        attributes: {},
      },
    ]);

    expect(result.events).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.events[0]?.type).toStrictEqual("UserUpserted");
    expect(result.errors[0]?.externalId).toStrictEqual("ng");
  });
});

describe("normalizeMembershipSnapshot", () => {
  test("MembershipSet event を生成する", () => {
    const ctx = createPipelineContext(TEST_TENANT_ID, SOURCE_SCIM_OKTA);
    const result = normalizeMembershipSnapshot(ctx, {
      source: SOURCE_SCIM_OKTA,
      groupExternalId: externalId("group-1"),
      memberExternalIds: [externalId("user-1"), externalId("user-2")],
    });

    expect(result.type).toStrictEqual("MembershipSet");
    expect(result.payload.groupExternalId).toStrictEqual("group-1");
    expect(result.payload.memberExternalIds).toStrictEqual([
      "user-1",
      "user-2",
    ]);
  });
});

import { describe, expect, test } from "vitest";

import {
  externalId,
  groupId,
  identityId,
  permissionId,
  sourceId,
  tenantId,
  userId,
} from "./branded.js";

describe("branded ID factories", () => {
  test("tenantId は string を TenantId として返す", () => {
    expect(tenantId("t1")).toStrictEqual("t1");
  });

  test("userId は string を UserId として返す", () => {
    expect(userId("u1")).toStrictEqual("u1");
  });

  test("identityId は string を IdentityId として返す", () => {
    expect(identityId("i1")).toStrictEqual("i1");
  });

  test("groupId は string を GroupId として返す", () => {
    expect(groupId("g1")).toStrictEqual("g1");
  });

  test("permissionId は string を PermissionId として返す", () => {
    expect(permissionId("p1")).toStrictEqual("p1");
  });

  test("externalId は string を ExternalId として返す", () => {
    expect(externalId("e1")).toStrictEqual("e1");
  });

  test("sourceId は string を SourceId として返す", () => {
    expect(sourceId("scim:okta")).toStrictEqual("scim:okta");
  });
});

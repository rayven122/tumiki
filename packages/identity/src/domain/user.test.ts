import { describe, expect, test } from "vitest";

import type { User } from "./user.js";
import { sourceId, tenantId, userId } from "./branded.js";
import { canonicalizeEmail } from "./email.js";
import { isActive } from "./user.js";

const buildUser = (status: User["status"]): User => ({
  id: userId("u1"),
  tenantId: tenantId("t1"),
  email: canonicalizeEmail("u@example.com"),
  displayName: "User",
  status,
  authoritativeSource: sourceId("scim:okta"),
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

describe("isActive", () => {
  test("ACTIVE な user は true を返す", () => {
    expect(isActive(buildUser("ACTIVE"))).toStrictEqual(true);
  });

  test("SUSPENDED な user は false を返す", () => {
    expect(isActive(buildUser("SUSPENDED"))).toStrictEqual(false);
  });

  test("DELETED な user は false を返す", () => {
    expect(isActive(buildUser("DELETED"))).toStrictEqual(false);
  });
});

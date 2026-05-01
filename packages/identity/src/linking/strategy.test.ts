import { describe, expect, test } from "vitest";

import type { Identity } from "../domain/identity.js";
import type { User } from "../domain/user.js";
import {
  externalId,
  identityId,
  sourceId,
  tenantId,
  userId,
} from "../domain/branded.js";
import { canonicalizeEmail } from "../domain/email.js";
import { decideLinking } from "./strategy.js";

const buildUser = (email: string): User => ({
  id: userId("user-1"),
  tenantId: tenantId("t1"),
  email: canonicalizeEmail(email),
  displayName: "User One",
  status: "ACTIVE",
  authoritativeSource: sourceId("scim:okta"),
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

const buildIdentity = (): Identity => ({
  id: identityId("identity-1"),
  tenantId: tenantId("t1"),
  userId: userId("user-1"),
  source: sourceId("scim:okta"),
  externalId: externalId("ext-1"),
  distinguishedName: null,
  securityIdentifier: null,
  attributes: {},
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

describe("decideLinking", () => {
  test("既存 Identity が存在すれば existing_identity を返す", () => {
    const user = buildUser("a@example.com");
    const result = decideLinking({
      existingIdentity: buildIdentity(),
      userOfExistingIdentity: user,
      userByEmail: null,
      emailVerified: true,
    });
    expect(result).toStrictEqual({ kind: "existing_identity", user });
  });

  test("既存 Identity なし + email 一致 + verified なら attach する", () => {
    const user = buildUser("a@example.com");
    const result = decideLinking({
      existingIdentity: null,
      userOfExistingIdentity: null,
      userByEmail: user,
      emailVerified: true,
    });
    expect(result).toStrictEqual({ kind: "attach_to_existing_user", user });
  });

  test("email 一致でも verified=false なら新規 User を作る", () => {
    const user = buildUser("a@example.com");
    const result = decideLinking({
      existingIdentity: null,
      userOfExistingIdentity: null,
      userByEmail: user,
      emailVerified: false,
    });
    expect(result).toStrictEqual({ kind: "create_new_user" });
  });

  test("既存 Identity なし + email 一致なし なら新規 User を作る", () => {
    const result = decideLinking({
      existingIdentity: null,
      userOfExistingIdentity: null,
      userByEmail: null,
      emailVerified: true,
    });
    expect(result).toStrictEqual({ kind: "create_new_user" });
  });
});

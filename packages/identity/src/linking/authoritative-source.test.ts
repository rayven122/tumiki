import { describe, expect, test } from "vitest";

import {
  buildTenantConfig,
  SOURCE_JIT_OKTA,
  SOURCE_SCIM_OKTA,
} from "../__tests__/fixtures/tenant-config.js";
import { sourceId } from "../domain/branded.js";
import {
  canDeactivateUser,
  canDefineGroupMembership,
  isJitAllowed,
} from "./authoritative-source.js";

describe("canDeactivateUser", () => {
  test("authoritative source からの deactivate は許可する", () => {
    const config = buildTenantConfig();
    expect(canDeactivateUser(config, SOURCE_SCIM_OKTA)).toStrictEqual(true);
  });

  test("authoritative でない source からの deactivate は拒否する", () => {
    const config = buildTenantConfig();
    expect(canDeactivateUser(config, SOURCE_JIT_OKTA)).toStrictEqual(false);
  });
});

describe("canDefineGroupMembership", () => {
  test("authoritative_for_groups と一致する source を許可する", () => {
    const config = buildTenantConfig();
    expect(canDefineGroupMembership(config, SOURCE_SCIM_OKTA)).toStrictEqual(
      true,
    );
  });

  test("authoritative でない source は拒否する", () => {
    const config = buildTenantConfig({
      authoritativeSourceForGroups: sourceId("pull:gws-dir"),
    });
    expect(canDefineGroupMembership(config, SOURCE_SCIM_OKTA)).toStrictEqual(
      false,
    );
  });
});

describe("isJitAllowed", () => {
  test("デフォルト設定では JIT を許可する", () => {
    expect(isJitAllowed(buildTenantConfig())).toStrictEqual(true);
  });

  test("jitAllowed=false なら拒否する", () => {
    expect(
      isJitAllowed(buildTenantConfig({ jitAllowed: false })),
    ).toStrictEqual(false);
  });
});

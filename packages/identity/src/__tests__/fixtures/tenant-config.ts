// テスト用 tenant 設定 builder

import type { TenantIdpConfiguration } from "../../domain/tenant.js";
import { sourceId, tenantId } from "../../domain/branded.js";

export const TEST_TENANT_ID = tenantId("tenant-test");
export const SOURCE_SCIM_OKTA = sourceId("scim:okta");
export const SOURCE_JIT_OKTA = sourceId("jit:okta");
export const SOURCE_PULL_GWS = sourceId("pull:gws-dir");

export const buildTenantConfig = (
  overrides?: Partial<TenantIdpConfiguration>,
): TenantIdpConfiguration => ({
  protocol: "OIDC",
  protocolConfig: {},
  provisioningMode: "SCIM",
  provisioningConfig: {},
  authoritativeSourceForUsers: SOURCE_SCIM_OKTA,
  authoritativeSourceForGroups: SOURCE_SCIM_OKTA,
  attributeMapping: {
    email: "email",
    displayName: "name",
    groups: "groups",
  },
  jitAllowed: true,
  ...overrides,
});

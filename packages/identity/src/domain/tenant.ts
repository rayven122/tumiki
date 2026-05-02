// Tenant: マルチテナント分離の単位
// IdP 設定とプロビジョニング設定を保持

import type { SourceId, TenantId } from "./branded.js";

export type IdpProtocol = "SAML" | "OIDC" | "LDAP";
export type ProvisioningMode = "SCIM" | "PULL" | "JIT_ONLY";

// 属性マッピング: 外部 IdP claim 名 → tumiki domain 属性名
export type AttributeMapping = {
  readonly email: string;
  readonly displayName: string;
  readonly groups: string;
};

export type TenantIdpConfiguration = {
  readonly protocol: IdpProtocol;
  // jackson connection ID や issuer URL など、protocol 固有の設定
  readonly protocolConfig: Readonly<Record<string, unknown>>;
  readonly provisioningMode: ProvisioningMode;
  readonly provisioningConfig: Readonly<Record<string, unknown>>;
  // どの source が User の真実か（deactivate 権限を持つか）
  readonly authoritativeSourceForUsers: SourceId;
  // どの source が Group/Membership の真実か
  readonly authoritativeSourceForGroups: SourceId;
  readonly attributeMapping: AttributeMapping;
  // JIT 経路で新規 User を作成することを許可するか
  readonly jitAllowed: boolean;
};

export type Tenant = {
  readonly id: TenantId;
  readonly slug: string;
  readonly name: string;
  readonly idpConfiguration: TenantIdpConfiguration;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

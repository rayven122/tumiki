// Identity: User と外部 IdP の対応関係
// 同一 User が複数 source に存在する場合、複数 Identity レコードが紐づく
// (source, externalId) で一意

import type {
  ExternalId,
  IdentityId,
  SourceId,
  TenantId,
  UserId,
} from "./branded.js";

// 外部 IdP から取得した属性（生データのスナップショット）
// linking や debug 用、business logic で直接参照しない
export type IdentityAttributes = Readonly<Record<string, unknown>>;

export type Identity = {
  readonly id: IdentityId;
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly source: SourceId;
  readonly externalId: ExternalId;
  // LDAP 後付け対応のための余地（Phase 1 では NULL 想定）
  readonly distinguishedName: string | null;
  readonly securityIdentifier: string | null;
  readonly attributes: IdentityAttributes;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

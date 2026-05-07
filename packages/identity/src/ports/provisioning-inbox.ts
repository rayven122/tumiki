// ProvisioningInboxPort: Push 型 / JIT の入口
// SCIM webhook や 認証成功 event を受け、normalize 済み snapshot として吐く
// 実装は jackson webhook handler / Auth.js signIn callback などになる

import type { ExternalId, SourceId } from "../domain/branded.js";
import type { CanonicalEmail } from "../domain/email.js";
import type { GroupOrigin } from "../domain/group.js";
import type { IdentityAttributes } from "../domain/identity.js";

// SCIM Push の正規化形
export type ScimUserPayload = {
  readonly source: SourceId;
  readonly externalId: ExternalId;
  readonly email: string;
  readonly displayName: string;
  readonly active: boolean;
  readonly attributes: IdentityAttributes;
};

export type ScimGroupPayload = {
  readonly source: SourceId;
  readonly externalId: ExternalId;
  readonly origin: GroupOrigin;
  readonly name: string;
  readonly description: string | null;
  readonly memberExternalIds: ReadonlyArray<ExternalId>;
};

// JIT 経路の入力: 認証成功時に IdP claim から導出される
// emailVerified が true の場合のみ既存 User への linking 候補となる
export type JitClaim = {
  readonly source: SourceId;
  readonly externalId: ExternalId;
  readonly email: CanonicalEmail;
  readonly emailVerified: boolean;
  readonly displayName: string;
  readonly groupExternalIds: ReadonlyArray<ExternalId>;
  readonly attributes: IdentityAttributes;
};

export type ProvisioningInboxPort = {
  readonly receiveScimUser: (payload: ScimUserPayload) => Promise<void>;
  readonly receiveScimUserDeactivation: (
    source: SourceId,
    externalId: ExternalId,
    reason: string,
  ) => Promise<void>;
  readonly receiveScimGroup: (payload: ScimGroupPayload) => Promise<void>;
  readonly receiveScimGroupDeletion: (
    source: SourceId,
    externalId: ExternalId,
  ) => Promise<void>;
  readonly receiveJitClaim: (claim: JitClaim) => Promise<void>;
};

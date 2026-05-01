// IdentityStorePort: 永続層への抽象化
// Phase 1 では in-memory 実装でテスト、Phase 2 で Prisma 実装に差し替え

import type {
  ExternalId,
  GroupId,
  SourceId,
  TenantId,
  UserId,
} from "../domain/branded.js";
import type { CanonicalEmail } from "../domain/email.js";
import type { Group } from "../domain/group.js";
import type { Identity } from "../domain/identity.js";
import type { Membership } from "../domain/membership.js";
import type { User } from "../domain/user.js";

// User upsert の入力: id は store 側で採番する場合があるため optional
export type UserDraft = {
  readonly tenantId: TenantId;
  readonly email: CanonicalEmail;
  readonly displayName: string;
  readonly authoritativeSource: SourceId;
};

export type IdentityDraft = {
  readonly tenantId: TenantId;
  readonly userId: UserId;
  readonly source: SourceId;
  readonly externalId: ExternalId;
  readonly attributes: Identity["attributes"];
};

export type GroupDraft = {
  readonly tenantId: TenantId;
  readonly origin: Group["origin"];
  readonly source: SourceId | null;
  readonly externalId: ExternalId | null;
  readonly name: string;
  readonly description: string | null;
};

export type IdentityStorePort = {
  // ---- User ----
  readonly findUserById: (
    tenantId: TenantId,
    id: UserId,
  ) => Promise<User | null>;
  readonly findUserByEmail: (
    tenantId: TenantId,
    email: CanonicalEmail,
  ) => Promise<User | null>;
  readonly createUser: (draft: UserDraft) => Promise<User>;
  readonly updateUserDisplayName: (
    tenantId: TenantId,
    id: UserId,
    displayName: string,
  ) => Promise<User>;
  readonly deactivateUser: (tenantId: TenantId, id: UserId) => Promise<User>;

  // ---- Identity ----
  readonly findIdentityBySourceAndExternalId: (
    tenantId: TenantId,
    source: SourceId,
    externalId: ExternalId,
  ) => Promise<Identity | null>;
  // バルク取得: Phase 2 で Prisma 実装する際 N+1 を避けるためのコア API
  readonly findIdentitiesBySourceAndExternalIds: (
    tenantId: TenantId,
    source: SourceId,
    externalIds: ReadonlyArray<ExternalId>,
  ) => Promise<ReadonlyArray<Identity>>;
  readonly listIdentitiesByUser: (
    tenantId: TenantId,
    userId: UserId,
  ) => Promise<ReadonlyArray<Identity>>;
  readonly createIdentity: (draft: IdentityDraft) => Promise<Identity>;
  readonly updateIdentityAttributes: (
    tenantId: TenantId,
    id: Identity["id"],
    attributes: Identity["attributes"],
  ) => Promise<Identity>;

  // ---- Group ----
  readonly findGroupBySourceAndExternalId: (
    tenantId: TenantId,
    source: SourceId,
    externalId: ExternalId,
  ) => Promise<Group | null>;
  readonly createGroup: (draft: GroupDraft) => Promise<Group>;
  readonly updateGroupName: (
    tenantId: TenantId,
    id: GroupId,
    name: string,
    description: string | null,
  ) => Promise<Group>;
  readonly deleteGroup: (tenantId: TenantId, id: GroupId) => Promise<void>;

  // ---- Membership ----
  readonly listMembershipsByGroup: (
    tenantId: TenantId,
    groupId: GroupId,
  ) => Promise<ReadonlyArray<Membership>>;
  readonly addMembership: (membership: Membership) => Promise<void>;
  readonly removeMembership: (
    tenantId: TenantId,
    userId: UserId,
    groupId: GroupId,
    source: SourceId,
  ) => Promise<void>;
};

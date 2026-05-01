// テスト専用 in-memory IdentityStore
// 本番には使わない。pipeline 契約を pure に検証する用途

import { randomUUID } from "node:crypto";

import type {
  ExternalId,
  GroupId,
  SourceId,
  TenantId,
  UserId,
} from "../../domain/branded.js";
import type { CanonicalEmail } from "../../domain/email.js";
import type { Group } from "../../domain/group.js";
import type { Identity } from "../../domain/identity.js";
import type { Membership } from "../../domain/membership.js";
import type { User } from "../../domain/user.js";
import type {
  GroupDraft,
  IdentityDraft,
  IdentityStorePort,
  UserDraft,
} from "../../ports/identity-store.js";
import {
  groupId as toGroupId,
  identityId as toIdentityId,
  userId as toUserId,
} from "../../domain/branded.js";

export type InMemoryStoreState = {
  users: Array<User>;
  identities: Array<Identity>;
  groups: Array<Group>;
  memberships: Array<Membership>;
};

export const createInMemoryIdentityStore = (
  initial?: Partial<InMemoryStoreState>,
): IdentityStorePort & { readonly state: InMemoryStoreState } => {
  const state: InMemoryStoreState = {
    users: initial?.users ? [...initial.users] : [],
    identities: initial?.identities ? [...initial.identities] : [],
    groups: initial?.groups ? [...initial.groups] : [],
    memberships: initial?.memberships ? [...initial.memberships] : [],
  };

  const findUserById = (tenantId: TenantId, id: UserId): User | null =>
    state.users.find((u) => u.tenantId === tenantId && u.id === id) ?? null;

  const findUserByEmail = (
    tenantId: TenantId,
    email: CanonicalEmail,
  ): User | null =>
    state.users.find((u) => u.tenantId === tenantId && u.email === email) ??
    null;

  const createUser = (draft: UserDraft): User => {
    const now = new Date();
    const user: User = {
      id: toUserId(randomUUID()),
      tenantId: draft.tenantId,
      email: draft.email,
      displayName: draft.displayName,
      status: "ACTIVE",
      authoritativeSource: draft.authoritativeSource,
      createdAt: now,
      updatedAt: now,
    };
    state.users.push(user);
    return user;
  };

  const updateUserDisplayName = (
    tenantId: TenantId,
    id: UserId,
    displayName: string,
  ): User => {
    const idx = state.users.findIndex(
      (u) => u.tenantId === tenantId && u.id === id,
    );
    if (idx === -1) throw new Error(`user not found: ${id}`);
    const current = state.users[idx];
    if (current === undefined) throw new Error(`user not found: ${id}`);
    const updated: User = {
      ...current,
      displayName,
      updatedAt: new Date(),
    };
    state.users[idx] = updated;
    return updated;
  };

  const deactivateUser = (tenantId: TenantId, id: UserId): User => {
    const idx = state.users.findIndex(
      (u) => u.tenantId === tenantId && u.id === id,
    );
    if (idx === -1) throw new Error(`user not found: ${id}`);
    const current = state.users[idx];
    if (current === undefined) throw new Error(`user not found: ${id}`);
    const updated: User = {
      ...current,
      status: "SUSPENDED",
      updatedAt: new Date(),
    };
    state.users[idx] = updated;
    return updated;
  };

  const findIdentityBySourceAndExternalId = (
    tenantId: TenantId,
    source: SourceId,
    externalId: ExternalId,
  ): Identity | null =>
    state.identities.find(
      (i) =>
        i.tenantId === tenantId &&
        i.source === source &&
        i.externalId === externalId,
    ) ?? null;

  const listIdentitiesByUser = (
    tenantId: TenantId,
    userId: UserId,
  ): ReadonlyArray<Identity> =>
    state.identities.filter(
      (i) => i.tenantId === tenantId && i.userId === userId,
    );

  const createIdentity = (draft: IdentityDraft): Identity => {
    const now = new Date();
    const identity: Identity = {
      id: toIdentityId(randomUUID()),
      tenantId: draft.tenantId,
      userId: draft.userId,
      source: draft.source,
      externalId: draft.externalId,
      distinguishedName: null,
      securityIdentifier: null,
      attributes: draft.attributes,
      createdAt: now,
      updatedAt: now,
    };
    state.identities.push(identity);
    return identity;
  };

  const updateIdentityAttributes = (
    tenantId: TenantId,
    id: Identity["id"],
    attributes: Identity["attributes"],
  ): Identity => {
    const idx = state.identities.findIndex(
      (i) => i.tenantId === tenantId && i.id === id,
    );
    if (idx === -1) throw new Error(`identity not found: ${id}`);
    const current = state.identities[idx];
    if (current === undefined) throw new Error(`identity not found: ${id}`);
    const updated: Identity = {
      ...current,
      attributes,
      updatedAt: new Date(),
    };
    state.identities[idx] = updated;
    return updated;
  };

  const findGroupBySourceAndExternalId = (
    tenantId: TenantId,
    source: SourceId,
    externalId: ExternalId,
  ): Group | null =>
    state.groups.find(
      (g) =>
        g.tenantId === tenantId &&
        g.source === source &&
        g.externalId === externalId,
    ) ?? null;

  const createGroup = (draft: GroupDraft): Group => {
    const now = new Date();
    const group: Group = {
      id: toGroupId(randomUUID()),
      tenantId: draft.tenantId,
      origin: draft.origin,
      source: draft.source,
      externalId: draft.externalId,
      name: draft.name,
      description: draft.description,
      createdAt: now,
      updatedAt: now,
    };
    state.groups.push(group);
    return group;
  };

  const updateGroupName = (
    tenantId: TenantId,
    id: GroupId,
    name: string,
    description: string | null,
  ): Group => {
    const idx = state.groups.findIndex(
      (g) => g.tenantId === tenantId && g.id === id,
    );
    if (idx === -1) throw new Error(`group not found: ${id}`);
    const current = state.groups[idx];
    if (current === undefined) throw new Error(`group not found: ${id}`);
    const updated: Group = {
      ...current,
      name,
      description,
      updatedAt: new Date(),
    };
    state.groups[idx] = updated;
    return updated;
  };

  const deleteGroup = (tenantId: TenantId, id: GroupId): void => {
    state.groups = state.groups.filter(
      (g) => !(g.tenantId === tenantId && g.id === id),
    );
    state.memberships = state.memberships.filter(
      (m) => !(m.tenantId === tenantId && m.groupId === id),
    );
  };

  const listMembershipsByGroup = (
    tenantId: TenantId,
    groupId: GroupId,
  ): ReadonlyArray<Membership> =>
    state.memberships.filter(
      (m) => m.tenantId === tenantId && m.groupId === groupId,
    );

  const addMembership = (membership: Membership): void => {
    const exists = state.memberships.some(
      (m) =>
        m.tenantId === membership.tenantId &&
        m.userId === membership.userId &&
        m.groupId === membership.groupId &&
        m.source === membership.source,
    );
    if (!exists) state.memberships.push(membership);
  };

  const removeMembership = (
    tenantId: TenantId,
    userId: UserId,
    groupId: GroupId,
    source: SourceId,
  ): void => {
    state.memberships = state.memberships.filter(
      (m) =>
        !(
          m.tenantId === tenantId &&
          m.userId === userId &&
          m.groupId === groupId &&
          m.source === source
        ),
    );
  };

  return {
    state,
    findUserById: async (t, id) => Promise.resolve(findUserById(t, id)),
    findUserByEmail: async (t, e) => Promise.resolve(findUserByEmail(t, e)),
    createUser: async (d) => Promise.resolve(createUser(d)),
    updateUserDisplayName: async (t, id, n) =>
      Promise.resolve(updateUserDisplayName(t, id, n)),
    deactivateUser: async (t, id) => Promise.resolve(deactivateUser(t, id)),
    findIdentityBySourceAndExternalId: async (t, s, e) =>
      Promise.resolve(findIdentityBySourceAndExternalId(t, s, e)),
    listIdentitiesByUser: async (t, u) =>
      Promise.resolve(listIdentitiesByUser(t, u)),
    createIdentity: async (d) => Promise.resolve(createIdentity(d)),
    updateIdentityAttributes: async (t, id, a) =>
      Promise.resolve(updateIdentityAttributes(t, id, a)),
    findGroupBySourceAndExternalId: async (t, s, e) =>
      Promise.resolve(findGroupBySourceAndExternalId(t, s, e)),
    createGroup: async (d) => Promise.resolve(createGroup(d)),
    updateGroupName: async (t, id, n, desc) =>
      Promise.resolve(updateGroupName(t, id, n, desc)),
    deleteGroup: async (t, id) => Promise.resolve(deleteGroup(t, id)),
    listMembershipsByGroup: async (t, g) =>
      Promise.resolve(listMembershipsByGroup(t, g)),
    addMembership: async (m) => Promise.resolve(addMembership(m)),
    removeMembership: async (t, u, g, s) =>
      Promise.resolve(removeMembership(t, u, g, s)),
  };
};

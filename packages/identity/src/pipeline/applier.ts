// Applier: Normalizer が出した event 候補を IdentityStore に反映する
// linking 戦略 / authoritative source 判定はここで効く
// store 更新と event 発行を atomic に扱う（in-memory 実装ではループでよい）

import type { UserId } from "../domain/branded.js";
import type {
  DomainEvent,
  GroupDeletedEvent,
  GroupUpsertedEvent,
  IdentityLinkedEvent,
  MembershipChangedEvent,
  MembershipSetEvent,
  UserDeactivatedEvent,
  UserUpsertedEvent,
} from "../domain/events.js";
import type { TenantIdpConfiguration } from "../domain/tenant.js";
import type { EventBusPort } from "../ports/event-bus.js";
import type { IdentityStorePort, UserDraft } from "../ports/identity-store.js";
import type { PipelineContext } from "./context.js";
import {
  canDeactivateUser,
  canDefineGroupMembership,
  isJitAllowed,
} from "../linking/authoritative-source.js";
import { decideLinking } from "../linking/strategy.js";
import { buildEventMeta } from "./context.js";

export type ApplierDeps = {
  readonly store: IdentityStorePort;
  readonly eventBus: EventBusPort;
  readonly tenantConfig: TenantIdpConfiguration;
};

export type ApplyOutcome =
  | { readonly kind: "applied" }
  | { readonly kind: "skipped"; readonly reason: string };

export const applyUserUpserted = async (
  deps: ApplierDeps,
  ctx: PipelineContext,
  event: UserUpsertedEvent,
): Promise<ApplyOutcome> => {
  const { store, eventBus, tenantConfig } = deps;
  const { source } = ctx;

  const existingIdentity = await store.findIdentityBySourceAndExternalId(
    ctx.tenantId,
    source,
    event.payload.externalId,
  );
  const userOfExistingIdentity =
    existingIdentity !== null
      ? await store.findUserById(ctx.tenantId, existingIdentity.userId)
      : null;
  const userByEmail = await store.findUserByEmail(
    ctx.tenantId,
    event.payload.email,
  );

  const decision = decideLinking({
    existingIdentity,
    userOfExistingIdentity,
    userByEmail,
    emailVerified: event.payload.emailVerified,
  });

  if (decision.kind === "create_new_user" && !isJitAllowed(tenantConfig)) {
    return {
      kind: "skipped",
      reason: "JIT user creation disabled by tenant configuration",
    };
  }

  let userId: UserId;
  let strategy: IdentityLinkedEvent["payload"]["strategy"];

  if (decision.kind === "existing_identity") {
    userId = decision.user.id;
    strategy = "external_id";
    await store.updateUserDisplayName(
      ctx.tenantId,
      userId,
      event.payload.displayName,
    );
    if (existingIdentity !== null) {
      await store.updateIdentityAttributes(
        ctx.tenantId,
        existingIdentity.id,
        event.payload.attributes,
      );
    }
  } else if (decision.kind === "attach_to_existing_user") {
    userId = decision.user.id;
    strategy = "email";
    await store.updateUserDisplayName(
      ctx.tenantId,
      userId,
      event.payload.displayName,
    );
    await store.createIdentity({
      tenantId: ctx.tenantId,
      userId,
      source,
      externalId: event.payload.externalId,
      attributes: event.payload.attributes,
    });
  } else {
    strategy = "new_user";
    const draft: UserDraft = {
      tenantId: ctx.tenantId,
      email: event.payload.email,
      displayName: event.payload.displayName,
      authoritativeSource: tenantConfig.authoritativeSourceForUsers,
    };
    const newUser = await store.createUser(draft);
    userId = newUser.id;
    await store.createIdentity({
      tenantId: ctx.tenantId,
      userId,
      source,
      externalId: event.payload.externalId,
      attributes: event.payload.attributes,
    });
  }

  await eventBus.publish(event);
  const linkedEvent: IdentityLinkedEvent = {
    type: "IdentityLinked",
    meta: buildEventMeta(ctx, {
      externalId: event.payload.externalId,
      payload: { userId, strategy },
      parentEventId: event.meta.eventId,
    }),
    payload: { userId, externalId: event.payload.externalId, strategy },
  };
  await eventBus.publish(linkedEvent);

  return { kind: "applied" };
};

export const applyUserDeactivated = async (
  deps: ApplierDeps,
  ctx: PipelineContext,
  event: UserDeactivatedEvent,
): Promise<ApplyOutcome> => {
  const { store, eventBus, tenantConfig } = deps;

  if (!canDeactivateUser(tenantConfig, ctx.source)) {
    return {
      kind: "skipped",
      reason: `source ${ctx.source} is not authoritative for user deactivation`,
    };
  }

  const identity = await store.findIdentityBySourceAndExternalId(
    ctx.tenantId,
    ctx.source,
    event.payload.externalId,
  );
  if (identity === null) {
    return { kind: "skipped", reason: "identity not found" };
  }

  await store.deactivateUser(ctx.tenantId, identity.userId);
  await eventBus.publish(event);
  return { kind: "applied" };
};

export const applyGroupUpserted = async (
  deps: ApplierDeps,
  ctx: PipelineContext,
  event: GroupUpsertedEvent,
): Promise<ApplyOutcome> => {
  const { store, eventBus } = deps;

  const existing = await store.findGroupBySourceAndExternalId(
    ctx.tenantId,
    ctx.source,
    event.payload.externalId,
  );

  if (existing === null) {
    await store.createGroup({
      tenantId: ctx.tenantId,
      origin: event.payload.origin,
      source: ctx.source,
      externalId: event.payload.externalId,
      name: event.payload.name,
      description: event.payload.description,
    });
  } else {
    await store.updateGroupName(
      ctx.tenantId,
      existing.id,
      event.payload.name,
      event.payload.description,
    );
  }

  await eventBus.publish(event);
  return { kind: "applied" };
};

export const applyGroupDeleted = async (
  deps: ApplierDeps,
  ctx: PipelineContext,
  event: GroupDeletedEvent,
): Promise<ApplyOutcome> => {
  const { store, eventBus, tenantConfig } = deps;

  if (!canDefineGroupMembership(tenantConfig, ctx.source)) {
    return {
      kind: "skipped",
      reason: `source ${ctx.source} is not authoritative for group deletion`,
    };
  }

  const existing = await store.findGroupBySourceAndExternalId(
    ctx.tenantId,
    ctx.source,
    event.payload.externalId,
  );
  if (existing === null) {
    return { kind: "skipped", reason: "group not found" };
  }

  await store.deleteGroup(ctx.tenantId, existing.id);
  await eventBus.publish(event);
  return { kind: "applied" };
};

export const applyMembershipSet = async (
  deps: ApplierDeps,
  ctx: PipelineContext,
  event: MembershipSetEvent,
): Promise<ApplyOutcome> => {
  const { store, eventBus } = deps;

  const group = await store.findGroupBySourceAndExternalId(
    ctx.tenantId,
    ctx.source,
    event.payload.groupExternalId,
  );
  if (group === null) {
    return { kind: "skipped", reason: "group not found for membership set" };
  }

  // 現状の membership と target を比較して差分を作る
  const current = await store.listMembershipsByGroup(ctx.tenantId, group.id);

  // 解決した external_id → User の対応表を作る（バルク取得で N+1 回避）
  const targetIdentities = await store.findIdentitiesBySourceAndExternalIds(
    ctx.tenantId,
    ctx.source,
    event.payload.memberExternalIds,
  );
  const targetUserIds = new Set<UserId>(targetIdentities.map((i) => i.userId));
  const currentUserIds = new Set<UserId>(current.map((m) => m.userId));

  // 追加対象: target にあって current にないもの
  for (const targetUserId of targetUserIds) {
    if (!currentUserIds.has(targetUserId)) {
      await store.addMembership({
        tenantId: ctx.tenantId,
        userId: targetUserId,
        groupId: group.id,
        source: ctx.source,
        createdAt: ctx.clock.now(),
      });
      const change: MembershipChangedEvent = {
        type: "MembershipChanged",
        meta: buildEventMeta(ctx, {
          externalId: event.payload.groupExternalId,
          payload: { userId: targetUserId, action: "added" },
          parentEventId: event.meta.eventId,
        }),
        payload: {
          userId: targetUserId,
          groupId: group.id,
          action: "added",
        },
      };
      await eventBus.publish(change);
    }
  }

  // 削除対象: current にあって target にないもの（authoritative のみ削除可）
  if (canDefineGroupMembership(deps.tenantConfig, ctx.source)) {
    for (const m of current) {
      if (!targetUserIds.has(m.userId)) {
        await store.removeMembership(
          ctx.tenantId,
          m.userId,
          group.id,
          ctx.source,
        );
        const change: MembershipChangedEvent = {
          type: "MembershipChanged",
          meta: buildEventMeta(ctx, {
            externalId: event.payload.groupExternalId,
            payload: { userId: m.userId, action: "removed" },
            parentEventId: event.meta.eventId,
          }),
          payload: {
            userId: m.userId,
            groupId: group.id,
            action: "removed",
          },
        };
        await eventBus.publish(change);
      }
    }
  }

  await eventBus.publish(event);
  return { kind: "applied" };
};

export const applyEvent = async (
  deps: ApplierDeps,
  ctx: PipelineContext,
  event: DomainEvent,
): Promise<ApplyOutcome> => {
  switch (event.type) {
    case "UserUpserted":
      return applyUserUpserted(deps, ctx, event);
    case "UserDeactivated":
      return applyUserDeactivated(deps, ctx, event);
    case "GroupUpserted":
      return applyGroupUpserted(deps, ctx, event);
    case "GroupDeleted":
      return applyGroupDeleted(deps, ctx, event);
    case "MembershipSet":
      return applyMembershipSet(deps, ctx, event);
    case "IdentityLinked":
    case "MembershipChanged":
      // Applier 自身が発行する派生 event は apply 対象外
      return { kind: "skipped", reason: "derived event not applied" };
  }
};

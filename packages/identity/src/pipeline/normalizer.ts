// Normalizer: Adapter 出力 (RemoteUserSnapshot 等) を Domain Event 候補に変換
// この段階では state を見ず、純粋に「外部状態 → event 候補」の変換のみ

import type {
  GroupDeletedEvent,
  GroupUpsertedEvent,
  MembershipSetEvent,
  UserDeactivatedEvent,
  UserUpsertedEvent,
} from "../domain/events.js";
import type {
  RemoteGroupSnapshot,
  RemoteMembershipSnapshot,
  RemoteUserSnapshot,
} from "../ports/types.js";
import type { PipelineContext } from "./context.js";
import { canonicalizeEmail, isValidEmail } from "../domain/email.js";
import { buildEventMeta } from "./context.js";

export type NormalizationError = {
  readonly externalId: string;
  readonly reason: string;
};

// discriminated union: 呼び出し側は kind で分岐するだけで型ガード不要
export type NormalizationOutcome<T> =
  | { readonly kind: "ok"; readonly event: T }
  | { readonly kind: "error"; readonly error: NormalizationError };

export type NormalizationResult<T> = {
  readonly events: ReadonlyArray<T>;
  readonly errors: ReadonlyArray<NormalizationError>;
};

export const normalizeUserSnapshot = (
  ctx: PipelineContext,
  snapshot: RemoteUserSnapshot,
): NormalizationOutcome<UserUpsertedEvent | UserDeactivatedEvent> => {
  if (!isValidEmail(snapshot.email)) {
    return {
      kind: "error",
      error: {
        externalId: snapshot.externalId,
        reason: `invalid email format: ${snapshot.email}`,
      },
    };
  }

  if (!snapshot.active) {
    return {
      kind: "ok",
      event: {
        type: "UserDeactivated",
        meta: buildEventMeta(ctx, {
          externalId: snapshot.externalId,
          payload: { active: false },
        }),
        payload: {
          externalId: snapshot.externalId,
          reason: "marked inactive in source IdP",
        },
      },
    };
  }

  return {
    kind: "ok",
    event: {
      type: "UserUpserted",
      meta: buildEventMeta(ctx, {
        externalId: snapshot.externalId,
        payload: {
          email: snapshot.email,
          displayName: snapshot.displayName,
          attributes: snapshot.attributes,
        },
      }),
      payload: {
        externalId: snapshot.externalId,
        email: canonicalizeEmail(snapshot.email),
        emailVerified: snapshot.emailVerified,
        displayName: snapshot.displayName,
        attributes: snapshot.attributes,
      },
    },
  };
};

export const normalizeGroupSnapshot = (
  ctx: PipelineContext,
  snapshot: RemoteGroupSnapshot,
): GroupUpsertedEvent => ({
  type: "GroupUpserted",
  meta: buildEventMeta(ctx, {
    externalId: snapshot.externalId,
    payload: {
      name: snapshot.name,
      description: snapshot.description,
    },
  }),
  payload: {
    externalId: snapshot.externalId,
    origin: snapshot.origin,
    name: snapshot.name,
    description: snapshot.description,
  },
});

export const normalizeMembershipSnapshot = (
  ctx: PipelineContext,
  snapshot: RemoteMembershipSnapshot,
): MembershipSetEvent => ({
  type: "MembershipSet",
  meta: buildEventMeta(ctx, {
    externalId: snapshot.groupExternalId,
    payload: { members: [...snapshot.memberExternalIds].sort() },
  }),
  payload: {
    groupExternalId: snapshot.groupExternalId,
    memberExternalIds: snapshot.memberExternalIds,
  },
});

// Pull 経路で「現在 IdP に存在しない group」を deletion event 化するヘルパ
export const normalizeGroupDeletion = (
  ctx: PipelineContext,
  externalId: GroupDeletedEvent["payload"]["externalId"],
): GroupDeletedEvent => ({
  type: "GroupDeleted",
  meta: buildEventMeta(ctx, {
    externalId,
    payload: { deleted: true },
  }),
  payload: { externalId },
});

export const normalizeUserSnapshots = (
  ctx: PipelineContext,
  snapshots: ReadonlyArray<RemoteUserSnapshot>,
): NormalizationResult<UserUpsertedEvent | UserDeactivatedEvent> => {
  const events: Array<UserUpsertedEvent | UserDeactivatedEvent> = [];
  const errors: Array<NormalizationError> = [];

  for (const snapshot of snapshots) {
    const outcome = normalizeUserSnapshot(ctx, snapshot);
    if (outcome.kind === "ok") {
      events.push(outcome.event);
    } else {
      errors.push(outcome.error);
    }
  }

  return { events, errors };
};

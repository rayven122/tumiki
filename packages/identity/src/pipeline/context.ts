// Pipeline 実行 context
// 1 回の同期サイクルを束ねる causation/correlation ID と、event meta 情報を生成

import { randomUUID } from "node:crypto";

import type { ExternalId, SourceId, TenantId } from "../domain/branded.js";
import type { EventMeta } from "../domain/events.js";
import { computeIdempotencyKey } from "../linking/idempotency.js";

export type PipelineClock = {
  readonly now: () => Date;
};

export const systemClock: PipelineClock = {
  now: () => new Date(),
};

export type PipelineContext = {
  readonly tenantId: TenantId;
  readonly source: SourceId;
  readonly correlationId: string;
  readonly clock: PipelineClock;
};

export const createPipelineContext = (
  tenantId: TenantId,
  source: SourceId,
  clock: PipelineClock = systemClock,
): PipelineContext => ({
  tenantId,
  source,
  correlationId: randomUUID(),
  clock,
});

export type EventMetaSeed = {
  readonly externalId: ExternalId;
  readonly payload: unknown;
  // この event を引き起こした親 event の eventId（Event Sourcing の慣例）
  // ルート event（外部 snapshot から最初に生成された event）では省略 → eventId 自身を causation とする
  readonly parentEventId?: string;
};

export const buildEventMeta = (
  ctx: PipelineContext,
  seed: EventMetaSeed,
): EventMeta => {
  const eventId = randomUUID();
  return {
    eventId,
    occurredAt: ctx.clock.now(),
    tenantId: ctx.tenantId,
    source: ctx.source,
    causationId: seed.parentEventId ?? eventId,
    correlationId: ctx.correlationId,
    idempotencyKey: computeIdempotencyKey(
      ctx.source,
      seed.externalId,
      seed.payload,
    ),
  };
};

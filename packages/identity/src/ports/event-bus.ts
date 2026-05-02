// EventBusPort: Domain Event を購読者に届ける抽象
// Phase 1 では in-memory 実装、Phase 2 で BullMQ や Postgres LISTEN/NOTIFY に差し替え

import type { DomainEvent } from "../domain/events.js";

export type DomainEventHandler = (event: DomainEvent) => Promise<void>;

export type EventBusPort = {
  readonly publish: (event: DomainEvent) => Promise<void>;
  readonly subscribe: (handler: DomainEventHandler) => () => void;
};

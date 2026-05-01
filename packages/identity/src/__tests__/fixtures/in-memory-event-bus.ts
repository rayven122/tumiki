// テスト専用 in-memory EventBus

import type { DomainEvent } from "../../domain/events.js";
import type {
  DomainEventHandler,
  EventBusPort,
} from "../../ports/event-bus.js";

export const createInMemoryEventBus = (): EventBusPort & {
  readonly published: ReadonlyArray<DomainEvent>;
} => {
  const handlers = new Set<DomainEventHandler>();
  const published: Array<DomainEvent> = [];

  return {
    get published() {
      return published;
    },
    publish: async (event) => {
      published.push(event);
      for (const handler of handlers) {
        await handler(event);
      }
    },
    subscribe: (handler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };
};

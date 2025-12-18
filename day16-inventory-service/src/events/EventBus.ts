import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';

export interface DomainEvent<TPayload = unknown> {
  eventId: string;
  type: string;
  payload: TPayload;
  occurredAt: string;
}

export type EventListener<TPayload = unknown> = (event: DomainEvent<TPayload>) => Promise<void> | void;

class EventBus {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(50);
  }

  public async publish<TPayload>(type: string, payload: TPayload): Promise<DomainEvent<TPayload>> {
    const event: DomainEvent<TPayload> = {
      eventId: randomUUID(),
      type,
      payload,
      occurredAt: new Date().toISOString(),
    };

    const listeners = this.emitter.listeners(type) as EventListener<TPayload>[];

    for (const listener of listeners) {
      try {
        await Promise.resolve(listener(event));
      } catch (err: any) {
        logger.error('domain_event.listener_error', {
          type,
          eventId: event.eventId,
          message: err?.message,
        });
      }
    }

    return event;
  }

  public subscribe<TPayload>(type: string, listener: EventListener<TPayload>): void {
    this.emitter.on(type, (event: DomainEvent<TPayload>) => {
      void Promise.resolve(listener(event)).catch((err) => {
        logger.error('domain_event.listener_error_async', {
          type,
          eventId: event.eventId,
          message: err?.message,
        });
      });
    });
  }
}

export const eventBus = new EventBus();

export const DOMAIN_EVENTS = {
  InventoryAdjusted: 'InventoryAdjusted',
  BatchConsumed: 'BatchConsumed',
  BatchQCPassed: 'BatchQCPassed',
} as const;

export type DomainEventType = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];

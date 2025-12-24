import { randomUUID } from 'crypto';
import { inMemoryStream } from './InMemoryStream';
import type { StreamEvent, StreamEventType, StreamMetrics } from './types';
import { withRequestContext } from '../utils/logger';

type ProducerOptions = {
  maxLocalQueue: number;
  lagHighWatermark: number;
};

type LocalQueued = { topic: 'domain-events'; event: StreamEvent };

type ProducerState = {
  localQueue: LocalQueued[];
  lastError?: string;
  publishedTotal: number;
  publishedInWindow: number;
  publishFailedTotal: number;
  droppedNonCritical: number;
  windowStartedAtMs: number;
};

const state: ProducerState = {
  localQueue: [],
  publishedTotal: 0,
  publishedInWindow: 0,
  publishFailedTotal: 0,
  droppedNonCritical: 0,
  windowStartedAtMs: Date.now(),
};

const optsDefault: ProducerOptions = {
  maxLocalQueue: Number(process.env.STREAM_LOCAL_QUEUE_MAX || 10_000),
  lagHighWatermark: Number(process.env.STREAM_LAG_HIGH_WATERMARK || 5_000),
};

const tick = () => {
  const now = Date.now();
  if (now - state.windowStartedAtMs >= 1000) {
    state.publishedInWindow = 0;
    state.windowStartedAtMs = now;
  }
};

const flush = () => {
  if (state.localQueue.length === 0) return;
  const batch = state.localQueue.splice(0, Math.min(500, state.localQueue.length));
  for (const item of batch) {
    try {
      inMemoryStream.publish(item.topic, item.event);
      state.publishedTotal += 1;
      state.publishedInWindow += 1;
    } catch (err: any) {
      state.lastError = err?.message || String(err);
      state.publishFailedTotal += 1;
      state.localQueue.unshift(item);
      break;
    }
  }
};

const startFlushLoop = (() => {
  let started = false;
  return () => {
    if (started) return;
    started = true;
    const t = setInterval(() => {
      tick();
      flush();
    }, Number(process.env.STREAM_LOCAL_QUEUE_FLUSH_MS || 250));
    (t as any).unref?.();
  };
})();

const computeLag = (): number => {
  const groupId = process.env.STREAM_CONSUMER_GROUP || 'analytics-pipeline-v1';
  return inMemoryStream.getLag(groupId);
};

const shouldDropNonCritical = (eventType: StreamEventType): boolean => {
  const lag = computeLag();
  if (lag < optsDefault.lagHighWatermark) return false;
  return eventType === 'InventoryLowStock';
};

export class EventProducer {
  private opts: ProducerOptions;

  constructor(opts?: Partial<ProducerOptions>) {
    this.opts = { ...optsDefault, ...(opts || {}) };
    startFlushLoop();
  }

  public publish<TPayload>(
    input: Omit<StreamEvent<TPayload>, 'eventId' | 'occurredAt' | 'version'> & { version?: 1 },
    ctx?: { requestId?: string; correlationId?: string },
  ): void {
    const log = withRequestContext(ctx?.requestId, ctx?.correlationId);

    const event: StreamEvent<TPayload> = {
      eventId: randomUUID(),
      eventType: input.eventType,
      version: 1,
      organizationId: input.organizationId,
      payload: input.payload,
      occurredAt: new Date().toISOString(),
    };

    queueMicrotask(() => {
      try {
        if (shouldDropNonCritical(event.eventType)) {
          state.droppedNonCritical += 1;
          log.warn('stream.publish.dropped', { eventType: event.eventType, eventId: event.eventId });
          return;
        }

        inMemoryStream.publish('domain-events', event);
        tick();
        state.publishedTotal += 1;
        state.publishedInWindow += 1;
      } catch (err: any) {
        state.lastError = err?.message || String(err);
        state.publishFailedTotal += 1;
        log.error('stream.publish.failed', { eventType: event.eventType, eventId: event.eventId, message: state.lastError });

        if (state.localQueue.length >= this.opts.maxLocalQueue) state.localQueue.shift();
        state.localQueue.push({ topic: 'domain-events', event });
      }
    });
  }
}

export const getStreamProducerMetrics = (): Pick<StreamMetrics, 'publishedTotal' | 'publishFailedTotal' | 'publishedPerSec' | 'localQueueDepth' | 'lastError'> & {
  droppedNonCritical: number;
} => ({
  publishedTotal: state.publishedTotal,
  publishFailedTotal: state.publishFailedTotal,
  publishedPerSec: state.publishedInWindow,
  localQueueDepth: state.localQueue.length,
  lastError: state.lastError,
  droppedNonCritical: state.droppedNonCritical,
});

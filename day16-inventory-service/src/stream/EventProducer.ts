import { randomUUID } from 'crypto';
import { inMemoryStream } from './InMemoryStream';
import type { PublishResult, StreamEvent, StreamEventType, StreamMetrics } from './types';
import { withRequestContext } from '../utils/logger';

type ProducerOptions = {
  instanceId?: string;
  maxLocalQueue: number;
  lagHighWatermark: number;
};

type LocalQueued = { topic: 'domain-events'; event: StreamEvent };

type ProducerState = {
  localQueue: LocalQueued[];
  lastError?: string;
  publishedTotal: number;
  publishFailedTotal: number;
  publishedInWindow: number;
  windowStartedAtMs: number;
  droppedNonCritical: number;
};

const state: ProducerState = {
  localQueue: [],
  publishedTotal: 0,
  publishFailedTotal: 0,
  publishedInWindow: 0,
  windowStartedAtMs: Date.now(),
  droppedNonCritical: 0,
};

const defaultOptions: ProducerOptions = {
  instanceId: process.env.INSTANCE_ID || 'inventory-service',
  maxLocalQueue: Number(process.env.STREAM_LOCAL_QUEUE_MAX || 10_000),
  lagHighWatermark: Number(process.env.STREAM_LAG_HIGH_WATERMARK || 5_000),
};

const tickRates = (): void => {
  const now = Date.now();
  if (now - state.windowStartedAtMs >= 1000) {
    state.publishedInWindow = 0;
    state.windowStartedAtMs = now;
  }
};

const computeLag = (): number => {
  const groupId = process.env.STREAM_CONSUMER_GROUP || 'analytics-pipeline-v1';
  return inMemoryStream.getLag(groupId);
};

const shouldDropNonCritical = (eventType: StreamEventType): boolean => {
  const lag = computeLag();
  if (lag < defaultOptions.lagHighWatermark) return false;
  // Non-critical events under pressure: low-stock spammy signals.
  return eventType === 'InventoryLowStock';
};

const flushLocalQueue = (): void => {
  if (state.localQueue.length === 0) return;
  const batch = state.localQueue.splice(0, Math.min(state.localQueue.length, 500));
  for (const item of batch) {
    try {
      inMemoryStream.publish(item.topic, item.event);
      state.publishedTotal += 1;
      state.publishedInWindow += 1;
    } catch (err: any) {
      state.lastError = err?.message || String(err);
      state.publishFailedTotal += 1;
      // push back for later
      state.localQueue.unshift(item);
      break;
    }
  }
};

// Flush periodically without blocking request path.
const startFlushLoop = (() => {
  let started = false;
  return () => {
    if (started) return;
    started = true;
    const intervalMs = Number(process.env.STREAM_LOCAL_QUEUE_FLUSH_MS || 250);
    const t = setInterval(() => {
      tickRates();
      flushLocalQueue();
    }, intervalMs);
    (t as any).unref?.();
  };
})();

export class EventProducer {
  private opts: ProducerOptions;

  constructor(opts?: Partial<ProducerOptions>) {
    this.opts = { ...defaultOptions, ...(opts || {}) };
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

    // Non-blocking: schedule on microtask.
    queueMicrotask(() => {
      void this.publishInternal(event, log);
    });
  }

  private async publishInternal(event: StreamEvent, log: ReturnType<typeof withRequestContext>): Promise<PublishResult> {
    tickRates();

    if (shouldDropNonCritical(event.eventType)) {
      state.droppedNonCritical += 1;
      log.warn('stream.publish.dropped', { eventType: event.eventType, eventId: event.eventId, reason: 'backpressure' });
      return { ok: true };
    }

    try {
      // In-memory is always available, but keep try/catch for future external drivers.
      inMemoryStream.publish('domain-events', event);
      state.publishedTotal += 1;
      state.publishedInWindow += 1;
      return { ok: true };
    } catch (err: any) {
      state.lastError = err?.message || String(err);
      state.publishFailedTotal += 1;
      log.error('stream.publish.failed', { eventType: event.eventType, eventId: event.eventId, message: state.lastError });

      // Fallback: local queue (bounded)
      if (state.localQueue.length >= this.opts.maxLocalQueue) {
        state.localQueue.shift();
      }
      state.localQueue.push({ topic: 'domain-events', event });

      return { ok: false, error: state.lastError ?? 'publish_failed' };
    }
  }
}

export const getStreamProducerMetrics = (): Pick<StreamMetrics, 'publishedTotal' | 'publishFailedTotal' | 'publishedPerSec' | 'localQueueDepth' | 'lastError'> & {
  droppedNonCritical: number;
} => {
  const perSec = state.publishedInWindow; // window is 1s
  return {
    publishedTotal: state.publishedTotal,
    publishFailedTotal: state.publishFailedTotal,
    publishedPerSec: perSec,
    localQueueDepth: state.localQueue.length,
    lastError: state.lastError,
    droppedNonCritical: state.droppedNonCritical,
  };
};

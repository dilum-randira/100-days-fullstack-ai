import { EventProducer } from '../stream/EventProducer';
import { OutboxEvent } from '../models/OutboxEvent';
import { outboxMetrics } from './outboxMetrics';
import { logger } from '../utils/logger';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type DispatcherOptions = {
  batchSize: number;
  pollIntervalMs: number;
  lockTimeoutMs: number;
  maxRetries: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
};

const defaults: DispatcherOptions = {
  batchSize: Number(process.env.OUTBOX_BATCH_SIZE || 50),
  pollIntervalMs: Number(process.env.OUTBOX_POLL_INTERVAL_MS || 500),
  lockTimeoutMs: Number(process.env.OUTBOX_LOCK_TIMEOUT_MS || 30_000),
  maxRetries: 5,
  baseBackoffMs: Number(process.env.OUTBOX_BASE_BACKOFF_MS || 500),
  maxBackoffMs: Number(process.env.OUTBOX_MAX_BACKOFF_MS || 30_000),
};

const computeBackoffMs = (retries: number, base: number, max: number) => {
  const ms = Math.min(max, base * 2 ** Math.max(0, retries));
  // Add small jitter to avoid thundering herd.
  const jitter = Math.floor(Math.random() * Math.min(250, ms));
  return ms + jitter;
};

export class OutboxDispatcher {
  private producer: EventProducer;
  private opts: DispatcherOptions;
  private running = false;

  constructor(producer?: EventProducer, opts?: Partial<DispatcherOptions>) {
    this.producer = producer || new EventProducer();
    this.opts = { ...defaults, ...(opts || {}) };
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    this.loop().catch((err: any) => {
      logger.error('outbox.dispatcher.crashed', { message: err?.message || String(err) });
      this.running = false;
    });
  }

  public stop(): void {
    this.running = false;
  }

  private async loop(): Promise<void> {
    logger.info('outbox.dispatcher.started', {
      pollIntervalMs: this.opts.pollIntervalMs,
      batchSize: this.opts.batchSize,
      maxRetries: this.opts.maxRetries,
    });

    while (this.running) {
      try {
        const processed = await this.pollOnce();
        if (processed === 0) {
          await sleep(this.opts.pollIntervalMs);
        }
      } catch (err: any) {
        logger.error('outbox.dispatcher.poll.error', { message: err?.message || String(err) });
        await sleep(this.opts.pollIntervalMs);
      }
    }

    logger.info('outbox.dispatcher.stopped');
  }

  private async pollOnce(): Promise<number> {
    const now = new Date();
    // lock expired events are eligible again
    const lockExpiredBefore = new Date(Date.now() - this.opts.lockTimeoutMs);

    // Claim events by moving status PENDING -> FAILED? no. We'll use a transient "lock" via updatedAt.
    // Approach: atomically pick and set updatedAt by doing findOneAndUpdate with status=PENDING and updatedAt older than lockExpired.
    let processed = 0;

    for (let i = 0; i < this.opts.batchSize; i += 1) {
      const claimed = await OutboxEvent.findOneAndUpdate(
        {
          status: 'PENDING',
          $or: [{ updatedAt: { $lte: lockExpiredBefore } }, { updatedAt: { $exists: false } }],
        },
        {
          $set: { updatedAt: now },
        },
        { sort: { createdAt: 1 }, new: true },
      ).exec();

      if (!claimed) break;

      processed += 1;
      await this.processOne(claimed.eventId);
    }

    return processed;
  }

  private async processOne(eventId: string): Promise<void> {
    const evt = await OutboxEvent.findOne({ eventId }).exec();
    if (!evt) return;

    // Idempotency: if already SENT, never publish again.
    if (evt.status === 'SENT') return;
    if (evt.status === 'FAILED') return;

    // Backoff based on retries/createdAt/updatedAt: compute next eligible time.
    const backoffMs = computeBackoffMs(evt.retries, this.opts.baseBackoffMs, this.opts.maxBackoffMs);
    const lastTouched = evt.updatedAt || evt.createdAt || new Date(0);
    if (Date.now() - lastTouched.getTime() < backoffMs) {
      return;
    }

    try {
      // Publish using deterministic eventId from outbox.
      this.producer.publishWithId(
        evt.eventId,
        {
          eventType: evt.eventType as any,
          version: 1,
          organizationId: undefined,
          payload: {
            aggregateType: evt.aggregateType,
            aggregateId: evt.aggregateId,
            ...((evt.payload as any) || {}),
          },
        },
        undefined,
      );

      await OutboxEvent.updateOne(
        { eventId: evt.eventId, status: 'PENDING' },
        { $set: { status: 'SENT', sentAt: new Date(), lastError: null } },
      ).exec();

      outboxMetrics.markPublishSuccess();
    } catch (err: any) {
      const message = err?.message || String(err);
      const nextRetries = (evt.retries || 0) + 1;

      if (nextRetries >= this.opts.maxRetries) {
        await OutboxEvent.updateOne(
          { eventId: evt.eventId },
          { $set: { status: 'FAILED', lastError: message }, $inc: { retries: 1 } },
        ).exec();
      } else {
        await OutboxEvent.updateOne(
          { eventId: evt.eventId, status: 'PENDING' },
          { $set: { lastError: message }, $inc: { retries: 1 } },
        ).exec();
      }

      outboxMetrics.markPublishFailure();

      logger.error('outbox.dispatcher.publish.failed', {
        eventId: evt.eventId,
        eventType: evt.eventType,
        retries: nextRetries,
        message,
      });
    }
  }
}

let singleton: OutboxDispatcher | null = null;

export const startOutboxDispatcher = (): void => {
  if (singleton) return;
  singleton = new OutboxDispatcher();
  singleton.start();
};

export const stopOutboxDispatcher = (): void => {
  if (!singleton) return;
  singleton.stop();
  singleton = null;
};

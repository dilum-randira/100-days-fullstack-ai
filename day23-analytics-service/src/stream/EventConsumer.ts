import type { StreamEvent, StreamMetrics } from './types';
import { inMemoryStream } from './InMemoryStream';

export type ConsumerHandler = (event: StreamEvent) => Promise<void>;

type ConsumerOptions = {
  groupId: string;
  maxRetries: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
};

type ConsumerState = {
  consumedTotal: number;
  consumedInWindow: number;
  windowStartedAtMs: number;
  failedTotal: number;
  deadLetteredTotal: number;
  lastError?: string;
};

const state: ConsumerState = {
  consumedTotal: 0,
  consumedInWindow: 0,
  windowStartedAtMs: Date.now(),
  failedTotal: 0,
  deadLetteredTotal: 0,
};

const tick = () => {
  const now = Date.now();
  if (now - state.windowStartedAtMs >= 1000) {
    state.consumedInWindow = 0;
    state.windowStartedAtMs = now;
  }
};

const backoff = async (attempt: number, base: number, max: number) => {
  const ms = Math.min(max, base * 2 ** Math.max(0, attempt - 1));
  await new Promise((r) => setTimeout(r, ms));
};

export class EventConsumer {
  private opts: ConsumerOptions;
  private handler: ConsumerHandler;
  private unsubscribe: (() => void) | null = null;

  constructor(handler: ConsumerHandler, opts?: Partial<ConsumerOptions>) {
    const groupId = opts?.groupId || process.env.STREAM_CONSUMER_GROUP || 'analytics-pipeline-v1';
    this.opts = {
      groupId,
      maxRetries: Number(opts?.maxRetries ?? process.env.STREAM_CONSUMER_MAX_RETRIES ?? 10),
      baseBackoffMs: Number(opts?.baseBackoffMs ?? process.env.STREAM_CONSUMER_BASE_BACKOFF_MS ?? 250),
      maxBackoffMs: Number(opts?.maxBackoffMs ?? process.env.STREAM_CONSUMER_MAX_BACKOFF_MS ?? 10_000),
    };
    this.handler = handler;
  }

  public start(): void {
    if (this.unsubscribe) return;
    this.unsubscribe = inMemoryStream.subscribe('domain-events', this.opts.groupId, async (event) => {
      tick();
      await this.processWithRetry(event);
      state.consumedTotal += 1;
      state.consumedInWindow += 1;
    });
  }

  public stop(): void {
    if (!this.unsubscribe) return;
    this.unsubscribe();
    this.unsubscribe = null;
  }

  private async processWithRetry(event: StreamEvent): Promise<void> {
    for (let attempt = 1; attempt <= this.opts.maxRetries; attempt += 1) {
      try {
        await this.handler(event);
        return;
      } catch (err: any) {
        state.failedTotal += 1;
        state.lastError = err?.message || String(err);
        if (attempt >= this.opts.maxRetries) {
          state.deadLetteredTotal += 1;
          return;
        }
        await backoff(attempt, this.opts.baseBackoffMs, this.opts.maxBackoffMs);
      }
    }
  }
}

export const getStreamConsumerMetrics = (groupId: string): Pick<StreamMetrics, 'consumedTotal' | 'consumedPerSec' | 'consumerLag' | 'deadLetteredTotal' | 'failedEventsCount' | 'lastError'> | any => ({
  consumedTotal: state.consumedTotal,
  consumedPerSec: state.consumedInWindow,
  consumerLag: inMemoryStream.getLag(groupId),
  deadLetteredTotal: state.deadLetteredTotal,
  failedEventsCount: state.failedTotal,
  lastError: state.lastError,
});

export type StreamEventType =
  | 'InventoryAdjusted'
  | 'BatchConsumed'
  | 'QCPassed'
  | 'InventoryLowStock';

export type StreamEventVersion = 1;

export interface StreamEvent<TPayload = unknown> {
  eventId: string;
  eventType: StreamEventType;
  version: StreamEventVersion;
  organizationId?: string;
  payload: TPayload;
  occurredAt: string;
}

export type PublishResult = { ok: true } | { ok: false; error: string };

export type StreamMetrics = {
  publishedTotal: number;
  publishedPerSec: number;
  publishFailedTotal: number;
  consumedTotal: number;
  consumedPerSec: number;
  consumerLag: number;
  deadLetteredTotal: number;
  localQueueDepth: number;
  lastError?: string;
};

import type mongoose from 'mongoose';
import { writeOutboxEvent } from './writeOutboxEvent';

export const writeBatchConsumedOutbox = async (
  session: mongoose.ClientSession,
  input: { batchId: string; payload: Record<string, unknown> },
): Promise<{ eventId: string }> => {
  return writeOutboxEvent(session, {
    aggregateType: 'Batch',
    aggregateId: input.batchId,
    eventType: 'BatchConsumed',
    payload: { batchId: input.batchId, ...input.payload },
  });
};

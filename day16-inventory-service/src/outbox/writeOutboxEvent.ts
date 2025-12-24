import type mongoose from 'mongoose';
import { randomUUID } from 'crypto';
import { OutboxEvent } from '../models/OutboxEvent';

export type OutboxWriteInput = {
  eventId?: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;
};

export const writeOutboxEvent = async (
  session: mongoose.ClientSession,
  input: OutboxWriteInput,
): Promise<{ eventId: string }> => {
  const eventId = input.eventId || randomUUID();

  await OutboxEvent.create(
    [
      {
        eventId,
        aggregateType: input.aggregateType,
        aggregateId: input.aggregateId,
        eventType: input.eventType,
        payload: input.payload,
        status: 'PENDING',
        retries: 0,
      },
    ],
    { session },
  );

  return { eventId };
};

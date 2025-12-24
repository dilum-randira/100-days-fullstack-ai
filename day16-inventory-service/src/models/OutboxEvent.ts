import mongoose, { Document, Schema } from 'mongoose';

export type OutboxStatus = 'PENDING' | 'SENT' | 'FAILED';

export interface IOutboxEvent {
  eventId: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: unknown;
  status: OutboxStatus;
  retries: number;
  createdAt?: Date;
  updatedAt?: Date;
  sentAt?: Date | null;
  lastError?: string | null;
}

export interface IOutboxEventDocument extends IOutboxEvent, Document {}

const outboxEventSchema = new Schema<IOutboxEventDocument>(
  {
    eventId: { type: String, required: true, trim: true, unique: true, index: true },
    aggregateType: { type: String, required: true, trim: true, index: true },
    aggregateId: { type: String, required: true, trim: true, index: true },
    eventType: { type: String, required: true, trim: true, index: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, required: true, enum: ['PENDING', 'SENT', 'FAILED'], default: 'PENDING', index: true },
    retries: { type: Number, required: true, default: 0, min: 0 },
    sentAt: { type: Date, required: false, default: null },
    lastError: { type: String, required: false, default: null },
  },
  { timestamps: true },
);

outboxEventSchema.index({ status: 1, createdAt: 1 });

export const OutboxEvent = mongoose.model<IOutboxEventDocument>('OutboxEvent', outboxEventSchema);

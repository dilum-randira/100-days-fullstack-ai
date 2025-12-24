import mongoose, { Document, Schema } from 'mongoose';

export interface IIdempotencyKey {
  key: string;
  endpoint: string;
  organizationId?: string;
  requestHash: string;
  responseBody: unknown;
  statusCode: number;
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IIdempotencyKeyDocument extends IIdempotencyKey, Document {}

const idempotencySchema = new Schema<IIdempotencyKeyDocument>(
  {
    key: { type: String, required: true },
    endpoint: { type: String, required: true },
    organizationId: { type: String, required: false, index: true },
    requestHash: { type: String, required: true },
    responseBody: { type: Schema.Types.Mixed, required: true },
    statusCode: { type: Number, required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

idempotencySchema.index({ key: 1, endpoint: 1, organizationId: 1 }, { unique: true });
idempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const IdempotencyKey = mongoose.model<IIdempotencyKeyDocument>('IdempotencyKey', idempotencySchema);

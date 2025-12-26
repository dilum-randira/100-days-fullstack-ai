import mongoose, { Document, Schema, Types } from 'mongoose';

export type RefreshSessionStatus = 'ACTIVE' | 'REVOKED';

export interface IRefreshSession {
  user: Types.ObjectId;
  sessionId: string; // stable id referenced by refresh JWT (sid)
  tokenVersion: number; // increments on rotation
  status: RefreshSessionStatus;
  userPasswordVersion: number; // snapshot from User.passwordVersion at issue time
  createdAt?: Date;
  updatedAt?: Date;
  lastUsedAt?: Date;
  lastUsedIp?: string;
  lastUsedUserAgent?: string;
}

export interface IRefreshSessionDocument extends IRefreshSession, Document {}

const refreshSessionSchema = new Schema<IRefreshSessionDocument>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: String, required: true, index: true, unique: true },
    tokenVersion: { type: Number, required: true, default: 0 },
    status: { type: String, required: true, enum: ['ACTIVE', 'REVOKED'], default: 'ACTIVE', index: true },
    userPasswordVersion: { type: Number, required: true, default: 0 },
    lastUsedAt: { type: Date, required: false },
    lastUsedIp: { type: String, required: false },
    lastUsedUserAgent: { type: String, required: false },
  },
  { timestamps: true },
);

refreshSessionSchema.index({ user: 1, status: 1 });

export const RefreshSession = mongoose.model<IRefreshSessionDocument>('RefreshSession', refreshSessionSchema);

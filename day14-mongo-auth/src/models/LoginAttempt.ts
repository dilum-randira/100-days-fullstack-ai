import mongoose, { Document, Schema } from 'mongoose';

export interface ILoginAttempt {
  key: string; // usually normalized email + ip
  count: number;
  firstAttemptAt: Date;
  lastAttemptAt: Date;
  lockedUntil?: Date;
  expiresAt: Date;
}

export interface ILoginAttemptDocument extends ILoginAttempt, Document {}

const loginAttemptSchema = new Schema<ILoginAttemptDocument>(
  {
    key: { type: String, required: true, unique: true, index: true },
    count: { type: Number, required: true, default: 0 },
    firstAttemptAt: { type: Date, required: true },
    lastAttemptAt: { type: Date, required: true },
    lockedUntil: { type: Date, required: false },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: false },
);

// TTL cleanup
loginAttemptSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const LoginAttempt = mongoose.model<ILoginAttemptDocument>('LoginAttempt', loginAttemptSchema);

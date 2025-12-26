import mongoose, { Schema, Document, Model } from 'mongoose';

export type SystemControlKey = 'system';

export interface ISystemControl extends Document {
  key: SystemControlKey;
  frozen: boolean;
  killedFeatures: string[];
  updatedAt: Date;
}

const SystemControlSchema = new Schema<ISystemControl>(
  {
    key: { type: String, required: true, unique: true, default: 'system' },
    frozen: { type: Boolean, required: true, default: false },
    killedFeatures: { type: [String], required: true, default: [] },
  },
  { timestamps: true },
);

SystemControlSchema.index({ key: 1 }, { unique: true });

export const SystemControl: Model<ISystemControl> =
  mongoose.models.SystemControl || mongoose.model<ISystemControl>('SystemControl', SystemControlSchema);

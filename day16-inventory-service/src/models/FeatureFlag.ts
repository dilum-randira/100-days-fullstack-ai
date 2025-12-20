import mongoose, { Document, Schema } from 'mongoose';

export interface IFeatureFlag {
  key: string;
  enabled: boolean;
  description?: string;
}

export interface IFeatureFlagDocument extends IFeatureFlag, Document {}

const featureFlagSchema = new Schema<IFeatureFlagDocument>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      required: true,
      default: false,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const FeatureFlag = mongoose.model<IFeatureFlagDocument>('FeatureFlag', featureFlagSchema);

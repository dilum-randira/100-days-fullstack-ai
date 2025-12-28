import mongoose, { Schema, Document } from 'mongoose';
import { assertLatestOnWrite, getSchemaVersion, logDeprecatedRead, LATEST_SCHEMA_VERSION } from './schemaVersion';

export interface IInventoryItem extends Document {
  sku: string;
  productName: string;
  location: string;
  quantity: number;
  minThreshold: number;
  category?: string;
  updatedAt: Date;
  schemaVersion?: number;
}

const InventoryItemSchema = new Schema<IInventoryItem>({
  sku: { type: String, required: true },
  productName: { type: String, required: true },
  location: { type: String, required: true },
  quantity: { type: Number, required: true },
  minThreshold: { type: Number, required: true },
  category: { type: String },
  schemaVersion: { type: Number, required: true, default: LATEST_SCHEMA_VERSION, min: 1 },
}, {
  timestamps: true,
  versionKey: false,
});

InventoryItemSchema.pre('validate', function (next) {
  try {
    assertLatestOnWrite('AnalyticsInventoryItem', this as any, LATEST_SCHEMA_VERSION);
    next();
  } catch (err) {
    next(err as any);
  }
});

InventoryItemSchema.post(['init', 'find', 'findOne', 'findOneAndUpdate', 'save'] as any, function (docs: any) {
  const normalizeOne = (doc: any) => {
    if (!doc) return;
    const v = getSchemaVersion(doc);
    if (v < LATEST_SCHEMA_VERSION) {
      logDeprecatedRead('AnalyticsInventoryItem', doc._id, v);
      doc.schemaVersion = LATEST_SCHEMA_VERSION;
    }
  };

  if (Array.isArray(docs)) {
    for (const d of docs) normalizeOne(d);
  } else {
    normalizeOne(docs);
  }
});

export const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);

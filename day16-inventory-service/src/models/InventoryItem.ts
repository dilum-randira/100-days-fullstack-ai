import mongoose, { Document, Schema } from 'mongoose';
import { addSchemaVersionToSchema, assertLatestOnWrite, getSchemaVersion, logDeprecatedRead, LATEST_SCHEMA_VERSION } from './schemaVersion';

export type InventoryStatus = 'available' | 'reserved' | 'damaged' | 'sold';

export interface IInventoryItem {
  organizationId: string;
  productName: string;
  batchId?: string;
  sku?: string;
  quantity: number;
  unit: string;
  location: string;
  supplier?: string;
  status: InventoryStatus;
  minThreshold: number;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  schemaVersion?: number;
}

export interface IInventoryItemDocument extends IInventoryItem, Document {}

const inventoryItemSchema = new Schema<IInventoryItemDocument>(
  {
    organizationId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    batchId: {
      type: String,
      required: false,
      trim: true,
    },
    sku: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    supplier: {
      type: String,
      required: false,
      trim: true,
    },
    status: {
      type: String,
      enum: ['available', 'reserved', 'damaged', 'sold'],
      default: 'available',
    },
    minThreshold: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      required: false,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

addSchemaVersionToSchema(inventoryItemSchema);

inventoryItemSchema.pre('validate', function (next) {
  try {
    assertLatestOnWrite('InventoryItem', this as any, LATEST_SCHEMA_VERSION);
    next();
  } catch (err) {
    next(err as any);
  }
});

inventoryItemSchema.post(['init', 'find', 'findOne', 'findOneAndUpdate', 'save'] as any, function (docs: any) {
  const normalizeOne = (doc: any) => {
    if (!doc) return;
    const v = getSchemaVersion(doc);
    if (v < LATEST_SCHEMA_VERSION) {
      logDeprecatedRead('InventoryItem', doc._id, v, LATEST_SCHEMA_VERSION, {
        organizationId: doc.organizationId || undefined,
      });
      doc.schemaVersion = LATEST_SCHEMA_VERSION;
    }
  };

  if (Array.isArray(docs)) {
    for (const d of docs) normalizeOne(d);
  } else {
    normalizeOne(docs);
  }
});

// Shard key index (hashed)
inventoryItemSchema.index({ organizationId: 'hashed' });

// Shard-friendly uniqueness (per tenant)
inventoryItemSchema.index({ organizationId: 1, sku: 1 }, { unique: true, sparse: true });

export const InventoryItem = mongoose.model<IInventoryItemDocument>('InventoryItem', inventoryItemSchema);

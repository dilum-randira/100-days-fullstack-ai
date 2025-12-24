import mongoose, { Document, Schema } from 'mongoose';

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

// Shard key index (hashed)
inventoryItemSchema.index({ organizationId: 'hashed' });

// Shard-friendly uniqueness (per tenant)
inventoryItemSchema.index({ organizationId: 1, sku: 1 }, { unique: true, sparse: true });

export const InventoryItem = mongoose.model<IInventoryItemDocument>('InventoryItem', inventoryItemSchema);

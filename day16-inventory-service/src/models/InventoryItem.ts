import mongoose, { Document, Schema } from 'mongoose';

export type InventoryStatus = 'available' | 'reserved' | 'damaged' | 'sold';

export interface IInventoryItem {
  productName: string;
  batchId?: string;
  sku?: string;
  quantity: number;
  unit: string;
  location: string;
  supplier?: string;
  status: InventoryStatus;
  minThreshold: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInventoryItemDocument extends IInventoryItem, Document {}

const inventoryItemSchema = new Schema<IInventoryItemDocument>(
  {
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
  },
  {
    timestamps: true,
  }
);

export const InventoryItem = mongoose.model<IInventoryItemDocument>('InventoryItem', inventoryItemSchema);

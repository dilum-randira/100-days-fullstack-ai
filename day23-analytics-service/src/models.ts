import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryItem extends Document {
  sku: string;
  productName: string;
  location: string;
  quantity: number;
  minThreshold: number;
  category?: string;
  updatedAt: Date;
}

const InventoryItemSchema = new Schema<IInventoryItem>({
  sku: { type: String, required: true },
  productName: { type: String, required: true },
  location: { type: String, required: true },
  quantity: { type: Number, required: true },
  minThreshold: { type: Number, required: true },
  category: { type: String },
}, {
  timestamps: true,
  versionKey: false,
});

export const InventoryItem = mongoose.model<IInventoryItem>('InventoryItem', InventoryItemSchema);

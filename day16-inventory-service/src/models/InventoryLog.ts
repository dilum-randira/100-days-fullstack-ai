import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IInventoryLog {
  itemId: Types.ObjectId;
  delta: number;
  oldQuantity: number;
  newQuantity: number;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  createdAt?: Date;
}

export interface IInventoryLogDocument extends IInventoryLog, Document {}

const inventoryLogSchema = new Schema<IInventoryLogDocument>(
  {
    itemId: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryItem',
      required: true,
      index: true,
    },
    delta: {
      type: Number,
      required: true,
    },
    oldQuantity: {
      type: Number,
      required: true,
    },
    newQuantity: {
      type: Number,
      required: true,
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
    timestamps: { createdAt: true, updatedAt: false },
  },
);

export const InventoryLog = mongoose.model<IInventoryLogDocument>('InventoryLog', inventoryLogSchema);

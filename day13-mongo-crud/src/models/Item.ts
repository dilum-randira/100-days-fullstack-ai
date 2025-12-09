import mongoose, { Document, Schema } from 'mongoose';

// TypeScript interface for Item
export interface IItem {
  name: string;
  quantity: number;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for Item document (includes Mongoose document properties)
export interface IItemDocument extends IItem, Document {}

// Mongoose Schema
const itemSchema = new Schema<IItemDocument>(
  {
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Create and export the model
const Item = mongoose.model<IItemDocument>('Item', itemSchema);

export default Item;

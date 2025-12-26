import mongoose, { Document, Schema } from 'mongoose';

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  // Used to invalidate refresh sessions after password changes.
  passwordVersion?: number;
  refreshInvalidBefore?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDocument extends IUser, Document {}

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    passwordVersion: {
      type: Number,
      required: true,
      default: 0,
    },
    refreshInvalidBefore: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model<IUserDocument>('User', userSchema);

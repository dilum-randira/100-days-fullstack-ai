import mongoose, { Document, Schema, Types } from 'mongoose';

export type StorageType = 'local' | 's3';

export interface IFile {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  storage: StorageType;
  key: string; // local filename or S3 key
  uploadedBy: Types.ObjectId;
  createdAt?: Date;
}

export interface IFileDocument extends IFile, Document {}

const fileSchema = new Schema<IFileDocument>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
    storage: { type: String, enum: ['local', 's3'], required: true },
    key: { type: String, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const FileModel = mongoose.model<IFileDocument>('File', fileSchema);

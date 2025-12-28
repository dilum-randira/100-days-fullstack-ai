import mongoose, { Document, Schema } from 'mongoose';
import { addSchemaVersionToSchema, assertLatestOnWrite, getSchemaVersion, logDeprecatedRead, LATEST_SCHEMA_VERSION } from './schemaVersion';

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  // Used to invalidate refresh sessions after password changes.
  passwordVersion?: number;
  refreshInvalidBefore?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  schemaVersion?: number;
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

addSchemaVersionToSchema(userSchema);

// Always write latest schema version, prevent writing deprecated formats
userSchema.pre('validate', function (next) {
  try {
    assertLatestOnWrite('User', this as any, LATEST_SCHEMA_VERSION);
    next();
  } catch (err) {
    next(err as any);
  }
});

// Read compatibility: tolerate legacy docs (schemaVersion missing/0) and log
userSchema.post(['init', 'find', 'findOne', 'findOneAndUpdate', 'save'] as any, function (docs: any) {
  const normalizeOne = (doc: any) => {
    if (!doc) return;
    const v = getSchemaVersion(doc);
    if (v < LATEST_SCHEMA_VERSION) {
      logDeprecatedRead('User', doc._id, v);
      // v0 -> v1 in-memory transform (currently no structural changes)
      doc.schemaVersion = LATEST_SCHEMA_VERSION;
    }
  };

  if (Array.isArray(docs)) {
    for (const d of docs) normalizeOne(d);
  } else {
    normalizeOne(docs);
  }
});

userSchema.index({ email: 1 }, { unique: true });

export const User = mongoose.model<IUserDocument>('User', userSchema);

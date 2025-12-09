import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getStorageConfig } from '../config/storage';
import { v4 as uuidv4 } from 'uuid';

const config = getStorageConfig();

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Unsupported file type'), false);
  }
  cb(null, true);
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

let storage: multer.StorageEngine;

if (config.provider === 'local') {
  const uploadDir = config.local.uploadDir;
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
      const uniqueName = `${base}-${uuidv4()}${ext}`;
      cb(null, uniqueName);
    },
  });
} else {
  // For S3 we use memory storage and upload in the service layer
  storage = multer.memoryStorage();
}

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).single('file');

export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).array('files', 10);

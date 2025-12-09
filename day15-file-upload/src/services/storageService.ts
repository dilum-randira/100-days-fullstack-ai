import fs from 'fs';
import path from 'path';
import { getStorageConfig } from '../config/storage';
import { s3 } from '../utils/s3Client';
import { v4 as uuidv4 } from 'uuid';

export interface StoredFileInfo {
  url: string;
  key: string;
  storage: 'local' | 's3';
}

export interface UploadFileParams {
  buffer?: Buffer; // for S3
  originalName: string;
  mimetype: string;
  size: number;
  localPath?: string; // for local diskStorage
}

const config = getStorageConfig();

export const uploadToStorage = async (file: UploadFileParams): Promise<StoredFileInfo> => {
  if (config.provider === 'local') {
    if (!file.localPath) {
      throw new Error('localPath is required for local storage');
    }

    const filename = path.basename(file.localPath);
    const url = `/uploads/${filename}`;

    return {
      url,
      key: filename,
      storage: 'local',
    };
  }

  if (!file.buffer) {
    throw new Error('buffer is required for S3 storage');
  }

  const ext = path.extname(file.originalName) || '';
  const key = `uploads/${uuidv4()}${ext}`;

  await s3
    .putObject({
      Bucket: config.s3.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
    .promise();

  const url = `https://${config.s3.bucketName}.s3.${config.s3.region}.amazonaws.com/${key}`;

  return {
    url,
    key,
    storage: 's3',
  };
};

export const deleteFromStorage = async (storage: 'local' | 's3', key: string): Promise<void> => {
  if (storage === 'local') {
    const filePath = path.join(getStorageConfig().local.uploadDir, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return;
  }

  await s3
    .deleteObject({
      Bucket: getStorageConfig().s3.bucketName,
      Key: key,
    })
    .promise();
};

export const getLocalFilePath = (key: string): string => {
  return path.join(getStorageConfig().local.uploadDir, key);
};

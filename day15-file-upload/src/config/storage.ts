export type StorageProvider = 'local' | 's3';

export interface StorageConfig {
  provider: StorageProvider;
  local: {
    uploadDir: string;
  };
  s3: {
    region: string;
    bucketName: string;
  };
}

export const getStorageConfig = (): StorageConfig => {
  const provider = (process.env.STORAGE_PROVIDER || 'local').toLowerCase() as StorageProvider;

  return {
    provider,
    local: {
      uploadDir: process.env.LOCAL_UPLOAD_DIR || 'uploads',
    },
    s3: {
      region: process.env.AWS_REGION || 'us-east-1',
      bucketName: process.env.S3_BUCKET_NAME || '',
    },
  };
};

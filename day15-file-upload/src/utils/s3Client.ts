import AWS from 'aws-sdk';
import { getStorageConfig } from '../config/storage';

const config = getStorageConfig();

if (config.provider === 's3') {
  AWS.config.update({
    region: config.s3.region,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });
}

export const s3 = new AWS.S3({
  signatureVersion: 'v4',
});

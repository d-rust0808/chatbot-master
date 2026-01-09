/**
 * Cloudflare R2 Storage Service
 * 
 * WHY: Upload files to Cloudflare R2 (S3-compatible)
 * - Scalable storage
 * - CDN integration
 * - Cost-effective
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config } from './config';
import { logger } from './logger';

// Initialize S3 client for R2
let s3Client: S3Client | null = null;

/**
 * Get or create S3 client for R2
 */
function getR2Client(): S3Client {
  if (!s3Client) {
    if (!config.r2.enabled) {
      throw new Error('R2 is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME');
    }

    s3Client = new S3Client({
      region: 'auto', // R2 uses 'auto' region
      endpoint: config.r2.endpoint || `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });

    logger.info('R2 S3 client initialized', {
      endpoint: config.r2.endpoint || `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      bucketName: config.r2.bucketName,
    });
  }

  return s3Client;
}

/**
 * Upload file to R2
 * 
 * @param file - File to upload
 * @param key - Object key (path) in R2 bucket
 * @returns Public URL of uploaded file
 */
export async function uploadToR2(
  file: { buffer: Buffer; mimetype: string; filename: string },
  key: string
): Promise<string> {
  if (!config.r2.enabled) {
    throw new Error('R2 is not enabled. Please configure R2 credentials.');
  }

  const client = getR2Client();

  try {
    logger.info('Uploading file to R2', {
      key,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.buffer.length,
    });

    const command = new PutObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Public read access
      ACL: 'public-read',
    });

    await client.send(command);

    // Build public URL
    const publicUrl = config.r2.publicUrl
      ? `${config.r2.publicUrl}/${key}`
      : `https://${config.r2.bucketName}.r2.dev/${key}`;

    logger.info('File uploaded to R2 successfully', {
      key,
      publicUrl,
    });

    return publicUrl;
  } catch (error) {
    logger.error('Failed to upload file to R2', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      key,
      filename: file.filename,
    });
    throw error;
  }
}

/**
 * Delete file from R2
 * 
 * @param key - Object key to delete
 */
export async function deleteFromR2(key: string): Promise<void> {
  if (!config.r2.enabled) {
    throw new Error('R2 is not enabled. Please configure R2 credentials.');
  }

  const client = getR2Client();

  try {
    const command = new DeleteObjectCommand({
      Bucket: config.r2.bucketName,
      Key: key,
    });

    await client.send(command);

    logger.info('File deleted from R2', { key });
  } catch (error) {
    logger.error('Failed to delete file from R2', {
      error: error instanceof Error ? error.message : String(error),
      key,
    });
    throw error;
  }
}


import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { env, isS3Configured } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * File storage abstraction.
 *
 * When AWS S3 credentials are present, uploads go to the configured bucket.
 * Otherwise we transparently fall back to local disk (./uploads) so the
 * project runs end-to-end without an AWS account — the storage strategy is
 * recorded on each booking so the rest of the app doesn't care which is used.
 */

let s3 = null;
if (isS3Configured) {
  s3 = new S3Client({
    region: env.aws.region,
    credentials: {
      accessKeyId: env.aws.accessKeyId,
      secretAccessKey: env.aws.secretAccessKey,
    },
  });
  logger.info(`Storage: AWS S3 bucket "${env.aws.bucket}" (${env.aws.region})`);
} else {
  logger.warn('Storage: AWS not configured — falling back to local disk (./uploads)');
}

const LOCAL_DIR = path.resolve('uploads');

function buildKey(userId, originalName) {
  const ext = path.extname(originalName) || '';
  const safe = path
    .basename(originalName, ext)
    .replace(/[^a-z0-9-_]/gi, '-')
    .slice(0, 40);
  return `bookings/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safe}${ext}`;
}

/**
 * Upload a buffer and return { url, key, storage }.
 * @param {Object} p
 * @param {Buffer} p.buffer
 * @param {string} p.originalName
 * @param {string} p.mimeType
 * @param {string} p.userId
 */
export async function uploadFile({ buffer, originalName, mimeType, userId }) {
  const key = buildKey(userId, originalName);

  if (s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.aws.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );
    const url = env.aws.publicUrl
      ? `${env.aws.publicUrl.replace(/\/$/, '')}/${key}`
      : `https://${env.aws.bucket}.s3.${env.aws.region}.amazonaws.com/${key}`;
    return { url, key, storage: 's3' };
  }

  // Local fallback
  const fullPath = path.join(LOCAL_DIR, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, buffer);
  return { url: `/uploads/${key}`, key, storage: 'local' };
}

/** Generate a time-limited signed URL for a private S3 object. */
export async function getSignedFileUrl(key, expiresIn = 3600) {
  if (!s3) return `/uploads/${key}`;
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: env.aws.bucket, Key: key }),
    { expiresIn }
  );
}

/** Best-effort delete; never throws so it can be fire-and-forget. */
export async function deleteFile(key, storage = 's3') {
  if (!key) return;
  try {
    if (storage === 's3' && s3) {
      await s3.send(new DeleteObjectCommand({ Bucket: env.aws.bucket, Key: key }));
    } else if (storage === 'local') {
      await fs.unlink(path.join(LOCAL_DIR, key)).catch(() => {});
    }
  } catch (err) {
    logger.warn(`Failed to delete file ${key}: ${err.message}`);
  }
}

export { LOCAL_DIR };

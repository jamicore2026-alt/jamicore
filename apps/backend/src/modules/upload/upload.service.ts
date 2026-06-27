// Upload Service - File validation and storage (local in dev, S3 in production)
import type { Queue } from 'bullmq';
import { fileTypeFromBuffer } from 'file-type';
import { writeFileSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { env } from '../../config/env.js';
import { ErrorCodes } from '../../errors/codes.js';

interface UploadOptions {
  maxSize?: number;
  allowedTypes?: string[];
}

const DEFAULT_OPTIONS: Required<UploadOptions> = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
};

interface UploadResult {
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

// S3 client - created lazily only when S3 env vars are present
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

const LOCAL_UPLOADS_DIR = join(process.cwd(), 'uploads');

export const createUploadService = (imageQueue?: Queue) => {
  // Ensure local uploads directory exists
  if (!existsSync(LOCAL_UPLOADS_DIR)) {
    mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
  }

  const useS3 = !!(env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);

  return {
    async validateFile(
      buffer: Buffer,
      uploadOptions: UploadOptions = {},
    ): Promise<{ ext: string; mime: string }> {
      const config = { ...DEFAULT_OPTIONS, ...uploadOptions };

      if (buffer.length > config.maxSize) {
        throw Object.assign(
          new Error(`File too large. Max size: ${config.maxSize / 1024 / 1024}MB`),
          { code: ErrorCodes.FILE_TOO_LARGE },
        );
      }

      const fileType = await fileTypeFromBuffer(buffer);

      if (!fileType || !config.allowedTypes.includes(fileType.mime)) {
        throw Object.assign(
          new Error(`Invalid file type. Allowed: ${config.allowedTypes.join(', ')}`),
          { code: ErrorCodes.INVALID_FILE_TYPE },
        );
      }

      return fileType;
    },

    async uploadImage(
      buffer: Buffer,
      storeId: string,
      folder: string = 'products',
    ): Promise<UploadResult> {
      const ALLOWED_FOLDERS = ['products', 'avatars', 'logos', 'banners'] as const;
      if (!ALLOWED_FOLDERS.includes(folder as typeof ALLOWED_FOLDERS[number])) {
        throw Object.assign(
          new Error(`Invalid upload folder. Allowed: ${ALLOWED_FOLDERS.join(', ')}`),
          { code: ErrorCodes.VALIDATION_ERROR },
        );
      }

      const fileType = await this.validateFile(buffer);

      const filename = `${folder}/${storeId}/${Date.now()}-${crypto.randomUUID()}.${fileType.ext}`;

      if (useS3) {
        // Production: upload to S3
        const client = getS3Client();
        await client.send(new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: filename,
          Body: buffer,
          ContentType: fileType.mime,
          CacheControl: 'public, max-age=31536000, immutable',
        }));

        const url = `https://${env.S3_BUCKET}.s3.${env.S3_REGION || 'us-east-1'}.amazonaws.com/${filename}`;

        // Queue image optimization job for async processing
        if (imageQueue) {
          await imageQueue.add('process-image', {
            storeId,
            originalKey: filename,
            originalUrl: url,
          });
        }

        return { filename, mimeType: fileType.mime, size: buffer.length, url };
      }

      // Development: save to local filesystem
      const dirPath = join(LOCAL_UPLOADS_DIR, folder, storeId);
      mkdirSync(dirPath, { recursive: true });
      const localPath = join(LOCAL_UPLOADS_DIR, filename);
      writeFileSync(localPath, buffer);

      const url = `/uploads/${filename}`;

      return { filename, mimeType: fileType.mime, size: buffer.length, url };
    },

    async deleteImage(url: string, storeId: string): Promise<void> {
      // Extract the filename/key from the URL. Handles both local
      // (/uploads/<folder>/<storeId>/<file>) and S3
      // (https://<bucket>.s3.<region>.amazonaws.com/<folder>/<storeId>/<file>).
      const urlPath = new URL(url, 'http://localhost').pathname;
      let filename = urlPath.replace(/^\/+/, '');
      if (filename.startsWith('uploads/')) {
        filename = filename.slice('uploads/'.length);
      }

      // Reject path traversal / malformed paths
      if (filename.length === 0 || filename.includes('..') || filename.startsWith('/')) {
        throw Object.assign(
          new Error('Invalid image path'),
          { code: ErrorCodes.VALIDATION_ERROR },
        );
      }

      // Expected layout: <folder>/<storeId>/<file...>
      const segments = filename.split('/');
      const ALLOWED_FOLDERS = ['products', 'avatars', 'logos', 'banners'];
      if (segments.length < 3 || !ALLOWED_FOLDERS.includes(segments[0])) {
        throw Object.assign(
          new Error('Invalid image path'),
          { code: ErrorCodes.VALIDATION_ERROR },
        );
      }

      // P1-S1: cross-tenant deletion guard. The storeId segment embedded in
      // the URL must match the authenticated merchant's store. Without this,
      // any merchant could delete another tenant's images by guessing/using
      // their upload URLs.
      if (segments[1] !== storeId) {
        throw Object.assign(
          new Error('Forbidden: image does not belong to this store'),
          { code: ErrorCodes.FORBIDDEN },
        );
      }

      if (useS3) {
        const client = getS3Client();
        await client.send(new DeleteObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: filename,
        }));
      } else {
        // Local filesystem: resolve to absolute and verify within uploads dir
        const localPath = resolve(join(LOCAL_UPLOADS_DIR, filename));
        const resolvedUploadsDir = resolve(LOCAL_UPLOADS_DIR);
        const uploadsPrefix = resolvedUploadsDir + sep;
        if (!localPath.startsWith(uploadsPrefix) && localPath !== resolvedUploadsDir) {
          throw Object.assign(
            new Error('Invalid image path'),
            { code: ErrorCodes.VALIDATION_ERROR },
          );
        }
        if (existsSync(localPath)) {
          unlinkSync(localPath);
        }
      }
    },
  };
};

export type UploadService = ReturnType<typeof createUploadService>;

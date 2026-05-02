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

    async deleteImage(url: string): Promise<void> {
      // Extract the filename/key from the URL
      const urlPath = new URL(url, 'http://localhost').pathname;
      const filename = urlPath.replace('/uploads/', '');

      // Reject path traversal attempts
      if (filename.includes('..') || filename.startsWith('/')) {
        throw Object.assign(
          new Error('Invalid image path'),
          { code: ErrorCodes.VALIDATION_ERROR },
        );
      }

      if (useS3) {
        // For S3, validate key is within allowed prefixes
        const ALLOWED_PREFIXES = ['products/', 'avatars/', 'logos/', 'banners/'];
        const isAllowed = ALLOWED_PREFIXES.some((p) => filename.startsWith(p));
        if (!isAllowed) {
          throw Object.assign(
            new Error('Invalid S3 object key'),
            { code: ErrorCodes.VALIDATION_ERROR },
          );
        }
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

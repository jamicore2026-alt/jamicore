import type { Job } from 'bullmq';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pino from 'pino';
import { env } from '../config/env.js';

const logger = pino({ level: env.LOG_LEVEL });

export interface ImageJobData {
  storeId: string;
  originalKey: string;
  originalUrl: string;
}

const s3 = new S3Client({
  region: env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
  },
});

const SIZES = [320, 640, 1024, 1920];

export async function processImageJob(job: Job<ImageJobData>): Promise<void> {
  const { storeId, originalKey, originalUrl } = job.data;

  try {
    // Fetch original image from S3
    const response = await fetch(originalUrl);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Generate WebP versions
    for (const size of SIZES) {
      const resized = await sharp(buffer)
        .resize(size, null, { withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();

      const key = originalKey.replace(/\.[^.]+$/, `-${size}w.webp`);
      await s3.send(new PutObjectCommand({
        Bucket: env.S3_BUCKET ?? '',
        Key: key,
        Body: resized,
        ContentType: 'image/webp',
      }));
    }

    // Generate AVIF version (largest size only for efficiency)
    const avifBuffer = await sharp(buffer)
      .resize(1024, null, { withoutEnlargement: true })
      .avif({ quality: 80 })
      .toBuffer();

    const avifKey = originalKey.replace(/\.[^.]+$/, '-1024w.avif');
    await s3.send(new PutObjectCommand({
      Bucket: env.S3_BUCKET ?? '',
      Key: avifKey,
      Body: avifBuffer,
      ContentType: 'image/avif',
    }));

    logger.info(`Processed image for store ${storeId}: ${originalKey}`);
  } catch (err) {
    logger.error(err, 'Image processing failed');
    throw err;
  }
}

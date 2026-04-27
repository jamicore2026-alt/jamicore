import 'dotenv/config';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { createReadStream, unlinkSync } from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';

const logger = pino({ level: env.LOG_LEVEL });

const execAsync = promisify(exec);

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dbName = env.DATABASE_URL?.split('/').pop()?.split('?')[0] ?? 'postgres';
  const filename = `${dbName}-backup-${timestamp}.sql`;
  const filepath = path.join('/tmp', filename);

  const pgDumpCommand = `pg_dump "${env.DATABASE_URL}" --no-owner --no-privileges > "${filepath}"`;
  await execAsync(pgDumpCommand);

  const s3 = new S3Client({
    region: env.S3_REGION ?? 'us-east-1',
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: env.S3_SECRET_ACCESS_KEY ?? '',
    },
  });

  await s3.send(new PutObjectCommand({
    Bucket: env.S3_BACKUP_BUCKET ?? '',
    Key: `backups/${filename}`,
    Body: createReadStream(filepath),
    ContentType: 'application/sql',
  }));

  unlinkSync(filepath);
  logger.info(`Backup uploaded: ${filename}`);
}

backup().catch((err) => {
  logger.error(err, 'Backup failed');
  process.exit(1);
});

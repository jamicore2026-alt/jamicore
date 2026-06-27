// Production off-host backup: pg_dump the database -> upload to S3.
// Run by the `backup` sidecar in docker-compose.prod.yml on a daily loop.

import 'dotenv/config';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { unlinkSync } from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteObjectsCommandInput,
} from '@aws-sdk/client-s3';
import { createReadStream } from 'node:fs';
import { env } from '../config/env.js';

const logger = pino({ level: env.LOG_LEVEL });

const execFileAsync = promisify(execFile);

// P1-C: fail fast with a clear message if the backup config is incomplete.
// Validated here (not in env.ts) so a missing backup bucket never blocks the
// main API from starting — only this sidecar fails.
function requireBackupEnv(): {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  retentionDays: number | null;
} {
  const missing: string[] = [];
  if (!env.S3_BACKUP_BUCKET) missing.push('S3_BACKUP_BUCKET');
  if (!env.S3_REGION) missing.push('S3_REGION');
  if (!env.S3_ACCESS_KEY_ID) missing.push('S3_ACCESS_KEY_ID');
  if (!env.S3_SECRET_ACCESS_KEY) missing.push('S3_SECRET_ACCESS_KEY');
  if (missing.length > 0) {
    throw new Error(`Backup cannot run — missing env: ${missing.join(', ')}`);
  }
  const rawRetention = process.env.BACKUP_RETENTION_DAYS;
  const retentionDays =
    rawRetention && /^\d+$/.test(rawRetention) ? Number(rawRetention) : null;
  return {
    bucket: env.S3_BACKUP_BUCKET as string,
    region: env.S3_REGION as string,
    accessKeyId: env.S3_ACCESS_KEY_ID as string,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY as string,
    retentionDays,
  };
}

// P1-C: prune backups older than retentionDays so S3 cost doesn't grow forever.
// Only touches the `backups/` prefix; never deletes anything else.
async function pruneOldBackups(
  s3: S3Client,
  bucket: string,
  retentionDays: number,
): Promise<number> {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const list = await s3.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: 'backups/' }),
  );
  const stale = (list.Contents ?? []).filter(
    (o) => (o.LastModified?.getTime() ?? Date.now()) < cutoff && o.Key,
  );
  if (stale.length === 0) return 0;

  const deleteInput: DeleteObjectsCommandInput = {
    Bucket: bucket,
    Delete: { Objects: stale.map((o) => ({ Key: o.Key as string })), Quiet: true },
  };
  await s3.send(new DeleteObjectsCommand(deleteInput));
  return stale.length;
}

async function backup() {
  const cfg = requireBackupEnv();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dbName = env.DATABASE_URL?.split('/').pop()?.split('?')[0] ?? 'postgres';
  const filename = `${dbName}-backup-${timestamp}.sql`;
  const filepath = path.join('/tmp', filename);

  // P1-C: execFile (not exec) + pg_dump --file avoids a shell, so a conninfo
  // URL with shell metacharacters can't be misinterpreted. 30-min timeout
  // prevents a wedged dump (e.g. waiting on a lock) from hanging the sidecar.
  logger.info({ filename }, 'Starting pg_dump');
  try {
    await execFileAsync(
      'pg_dump',
      ['--no-owner', '--no-privileges', `--file=${filepath}`, env.DATABASE_URL],
      { timeout: 30 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 },
    );
  } catch (err) {
    throw new Error(
      `pg_dump failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const s3 = new S3Client({
    region: cfg.region,
    credentials: {
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    },
  });

  await s3.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: `backups/${filename}`,
      Body: createReadStream(filepath),
      ContentType: 'application/sql',
    }),
  );
  logger.info({ filename }, 'Backup uploaded to S3');

  unlinkSync(filepath);

  if (cfg.retentionDays && cfg.retentionDays > 0) {
    const pruned = await pruneOldBackups(s3, cfg.bucket, cfg.retentionDays);
    if (pruned > 0) {
      logger.info({ pruned, retentionDays: cfg.retentionDays }, 'Pruned old backups');
    }
  }
}

backup().catch((err) => {
  logger.error(err, 'Backup failed');
  process.exit(1);
});
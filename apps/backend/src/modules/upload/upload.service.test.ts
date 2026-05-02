import { describe, it, expect, vi } from 'vitest';
import { createUploadService } from './upload.service.js';
import { ErrorCodes } from '../../errors/codes.js';

// ─── Mock file-type ───
vi.mock('file-type', () => ({
  fileTypeFromBuffer: vi.fn(),
}));
import { fileTypeFromBuffer } from 'file-type';
const mockFileType = fileTypeFromBuffer as unknown as ReturnType<typeof vi.fn>;

// ─── Mock fs ───
vi.mock('node:fs', () => ({
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
}));

// ─── Mock S3 client ───
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue(undefined),
  })),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

describe('uploadService.validateFile', () => {
  it('returns file type for a valid image buffer', async () => {
    mockFileType.mockResolvedValue({ ext: 'png', mime: 'image/png' });
    const service = createUploadService();
    const result = await service.validateFile(Buffer.from('fake-png'));
    expect(result).toEqual({ ext: 'png', mime: 'image/png' });
  });

  it('throws FILE_TOO_LARGE when buffer exceeds maxSize', async () => {
    const service = createUploadService();
    const bigBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    await expect(service.validateFile(bigBuffer)).rejects.toMatchObject({
      code: ErrorCodes.FILE_TOO_LARGE,
    });
  });

  it('throws INVALID_FILE_TYPE when file type is not allowed', async () => {
    mockFileType.mockResolvedValue({ ext: 'exe', mime: 'application/x-msdownload' });
    const service = createUploadService();
    await expect(service.validateFile(Buffer.from('fake-exe'))).rejects.toMatchObject({
      code: ErrorCodes.INVALID_FILE_TYPE,
    });
  });

  it('throws INVALID_FILE_TYPE when file type cannot be determined', async () => {
    mockFileType.mockResolvedValue(null);
    const service = createUploadService();
    await expect(service.validateFile(Buffer.from('unknown'))).rejects.toMatchObject({
      code: ErrorCodes.INVALID_FILE_TYPE,
    });
  });
});

describe('uploadService.uploadImage', () => {
  it('throws VALIDATION_ERROR for disallowed folder', async () => {
    mockFileType.mockResolvedValue({ ext: 'png', mime: 'image/png' });
    const service = createUploadService();
    await expect(service.uploadImage(Buffer.from('img'), 'store-1', 'malicious')).rejects.toMatchObject({
      code: ErrorCodes.VALIDATION_ERROR,
    });
  });
});

describe('uploadService.deleteImage', () => {
  it('throws VALIDATION_ERROR for path traversal attempt', async () => {
    const service = createUploadService();
    await expect(service.deleteImage('/uploads/../../etc/passwd')).rejects.toMatchObject({
      code: ErrorCodes.VALIDATION_ERROR,
    });
  });

  it('throws VALIDATION_ERROR for S3 key outside allowed prefixes', async () => {
    vi.doMock('../../config/env.js', () => ({
      env: {
        S3_BUCKET: 'bucket',
        S3_ACCESS_KEY_ID: 'key',
        S3_SECRET_ACCESS_KEY: 'secret',
      },
    }));
    const service = createUploadService();
    await expect(service.deleteImage('https://bucket.s3.us-east-1.amazonaws.com/malicious/file.txt')).rejects.toMatchObject({
      code: ErrorCodes.VALIDATION_ERROR,
    });
  });
});

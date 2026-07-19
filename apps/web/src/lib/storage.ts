/**
 * Persistent Storage Abstraction for Media Uploads.
 *
 * Supports: local filesystem (development), S3-compatible (R2, Supabase S3)
 *
 * Configure via environment variables:
 *   UPLOAD_STORAGE_PROVIDER = "local" | "s3"
 *   UPLOAD_STORAGE_BUCKET  = bucket name (for S3)
 *   UPLOAD_STORAGE_ACCESS_KEY  = access key (for S3)
 *   UPLOAD_STORAGE_SECRET_KEY  = secret key (for S3)
 *   UPLOAD_STORAGE_ENDPOINT    = endpoint URL (for R2/S3-compatible)
 *   UPLOAD_STORAGE_REGION      = region (for AWS S3)
 *
 * In production, use Cloudflare R2, AWS S3, or Supabase Storage.
 * Never rely on the local filesystem for production media.
 */

import { createLogger } from '@/lib/logger';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

const log = createLogger('lib/storage');

// ESLint: interface method params are not variable declarations — they are signatures
/* eslint-disable no-unused-vars */
export interface StorageProvider {
  /** Upload a file buffer and return the public URL */
  upload(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<string>;

  /** Delete a file by its URL */
  delete(url: string): Promise<void>;

  /** Check if storage is configured for production use */
  isProductionReady(): boolean;
}
/* eslint-enable no-unused-vars */

// ─── Local Filesystem Provider (Development only) ──────────────────────────

class LocalStorageProvider implements StorageProvider {
  private uploadDir: string;

  constructor() {
    this.uploadDir = join(process.cwd(), 'public', 'uploads');
  }

  async upload(buffer: Buffer, _filename: string, _mimeType: string): Promise<string> {
    const ext = extname(_filename) || '.bin';
    const uniqueName = `${randomUUID()}${ext}`;
    const filePath = join(this.uploadDir, uniqueName);

    await mkdir(this.uploadDir, { recursive: true });
    await writeFile(filePath, buffer);

    const url = `/uploads/${uniqueName}`;
    log.info({ url, size: buffer.length }, 'File saved locally');
    return url;
  }

  async delete(url: string): Promise<void> {
    const filename = url.replace('/uploads/', '');
    const filePath = join(this.uploadDir, filename);
    await unlink(filePath).catch((err) => {
      log.warn({ url, error: String(err) }, 'Failed to delete local file');
    });
  }

  isProductionReady(): boolean {
    return false;
  }
}

// ─── S3-Compatible Provider (Production) ───────────────────────────────────

class S3StorageProvider implements StorageProvider {
  private bucket: string;
  private endpoint: string;
  private accessKey: string;
  private secretKey: string;
  private region: string;

  constructor() {
    this.bucket = process.env.UPLOAD_STORAGE_BUCKET || 'jamming-uploads';
    this.endpoint = process.env.UPLOAD_STORAGE_ENDPOINT || '';
    this.accessKey = process.env.UPLOAD_STORAGE_ACCESS_KEY || '';
    this.secretKey = process.env.UPLOAD_STORAGE_SECRET_KEY || '';
    this.region = process.env.UPLOAD_STORAGE_REGION || 'auto';
  }

  async upload(_buffer: Buffer, _filename: string, _mimeType: string): Promise<string> {
    // Dynamic import — @aws-sdk/client-s3 is not installed yet
    // This will be enabled when the S3 SDK is added as a dependency
    log.warn({ filename: _filename, size: _buffer.length, mimeType: _mimeType }, 'S3 upload not implemented — SDK not installed');
    throw new Error(
      'S3 storage is not yet configured. Install @aws-sdk/client-s3 and set ' +
      'UPLOAD_STORAGE_ACCESS_KEY, UPLOAD_STORAGE_SECRET_KEY, UPLOAD_STORAGE_ENDPOINT.',
    );
  }

  async delete(_url: string): Promise<void> {
    log.warn({ url: _url }, 'S3 delete not implemented — SDK not installed');
    throw new Error('S3 storage delete not yet implemented.');
  }

  isProductionReady(): boolean {
    return !!(this.accessKey && this.secretKey && this.endpoint);
  }
}

// ─── Provider Selection ────────────────────────────────────────────────────

function createStorageProvider(): StorageProvider {
  const provider = process.env.UPLOAD_STORAGE_PROVIDER || 'local';

  switch (provider) {
    case 's3':
    case 'r2':
      return new S3StorageProvider();
    case 'local':
    default:
      return new LocalStorageProvider();
  }
}

export const storage: StorageProvider = createStorageProvider();

/**
 * Validate that storage is properly configured for production.
 * In production, local storage is rejected with a clear error.
 */
export function ensureProductionStorage(): void {
  if (process.env.NODE_ENV === 'production' && !storage.isProductionReady()) {
    throw new Error(
      'Production storage is not configured. Set UPLOAD_STORAGE_PROVIDER=s3 ' +
      'and provide valid S3-compatible credentials (R2, AWS S3, Supabase S3). ' +
      'Local filesystem storage is not safe for production.',
    );
  }
}

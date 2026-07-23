import { google } from 'googleapis';
import { Readable } from 'stream';

/**
 * Google Drive service for payment proof storage.
 *
 * Supports two credential formats (checked in order):
 *   1. GOOGLE_SERVICE_ACCOUNT_KEY_JSON — a single JSON blob (legacy)
 *   2. GOOGLE_PROJECT_ID + GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY (recommended)
 *
 * When GOOGLE_DRIVE_ENABLED is not 'true', all Drive operations are skipped
 * and proofs are stored as LOCAL entries.
 */

const ROOT_FOLDER_NAME = 'Evora Payment Proofs';

interface DriveUploadResult {
  fileId: string;
  viewUrl: string;
}

export class GoogleDriveService {
  private drive;
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.GOOGLE_DRIVE_ENABLED === 'true';
    if (!this.enabled) {
      this.drive = null as any;
      return;
    }

    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    let credentials: { client_email: string; private_key: string };

    if (keyJson) {
      // Legacy format: single JSON blob with entire service account key
      try {
        const parsed = JSON.parse(keyJson);
        credentials = {
          client_email: parsed.client_email,
          private_key: parsed.private_key,
        };
      } catch {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_JSON is not valid JSON');
      }
    } else if (projectId && clientEmail && privateKey) {
      // Recommended format: individual env vars
      credentials = {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      };
    } else {
      throw new Error(
        'Google Drive credentials not configured. Set either GOOGLE_SERVICE_ACCOUNT_KEY_JSON ' +
        'or GOOGLE_PROJECT_ID + GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.',
      );
    }

    const auth = new google.auth.JWT(
      credentials.client_email,
      undefined,
      credentials.private_key,
      ['https://www.googleapis.com/auth/drive.file'],
    );

    this.drive = google.drive({ version: 'v3', auth });
  }

  /**
   * Ensure the payment proof folder structure exists:
   * Evora Payment Proofs/{YEAR}/{EVENT-SLUG}/{ORDER-NUMBER}/
   */
  private async ensurePaymentProofFolder(
    eventSlug: string,
    orderNumber: string,
  ): Promise<string> {
    const year = new Date().getFullYear().toString();

    const rootId = await this.findOrCreateFolder(ROOT_FOLDER_NAME, undefined);
    const yearId = await this.findOrCreateFolder(year, rootId);
    const eventId = await this.findOrCreateFolder(eventSlug, yearId);
    const orderId = await this.findOrCreateFolder(orderNumber, eventId);
    return orderId;
  }

  /**
   * Find or create a folder by name under a parent.
   */
  private async findOrCreateFolder(
    name: string,
    parentId?: string,
  ): Promise<string> {
    const escapedName = name.replace(/'/g, "\\'");
    const query = parentId
      ? `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and '${parentId}' in parents and trashed=false`
      : `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false`;

    const res = await this.drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id!;
    }

    const folderRes = await this.drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : [],
      },
      fields: 'id',
    });

    return folderRes.data.id!;
  }

  /**
   * Upload payment proof screenshot to Google Drive.
   *
   * Folder structure:
   *   Evora Payment Proofs/{YEAR}/{EVENT-SLUG}/{ORDER-NUMBER}/
   *
   * File naming:
   *   {ORDER-NUMBER}__UTR_{UTR-MASKED}__proof.{ext}
   *
   * UTR is masked to last 4 digits for privacy in file names.
   * Example:
   *   ORD-ABC123__UTR__8901__proof.png
   */
  async uploadPaymentProof(
    eventSlug: string,
    orderNumber: string,
    utrNumber: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<DriveUploadResult> {
    if (!this.enabled) {
      throw new Error('Google Drive is not enabled (set GOOGLE_DRIVE_ENABLED=true)');
    }

    const folderId = await this.ensurePaymentProofFolder(eventSlug, orderNumber);

    // Mask UTR — keep last 4 chars for traceability, mask the rest
    const utrMasked =
      utrNumber.length > 4
        ? `${'X'.repeat(utrNumber.length - 4)}${utrNumber.slice(-4)}`
        : utrNumber;

    const ext = this.getExtension(mimeType);
    const storedFileName = `${orderNumber}__UTR__${utrMasked}__proof${ext}`;

    const stream = Readable.from(fileBuffer);

    const res = await this.drive.files.create({
      requestBody: {
        name: storedFileName,
        parents: [folderId],
        description: `Payment proof for order ${orderNumber}, UTR ${utrNumber}`,
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, webViewLink',
    });

    const fileId = res.data.id!;
    const viewUrl = res.data.webViewLink!;

    return { fileId, viewUrl };
  }

  /**
   * Get file extension from MIME type.
   */
  private getExtension(mimeType: string): string {
    switch (mimeType) {
      case 'image/jpeg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      default:
        return '.bin';
    }
  }

  /**
   * Test Google Drive connectivity by listing the root folder.
   * Used by the /admin/drive/test endpoint.
   */
  async testConnectivity(): Promise<{
    ok: boolean;
    rootFolderName: string;
    folders: string[];
  }> {
    if (!this.enabled) {
      return {
        ok: false,
        rootFolderName: ROOT_FOLDER_NAME,
        folders: [],
      };
    }

    const rootId = await this.findOrCreateFolder(ROOT_FOLDER_NAME, undefined);
    const res = await this.drive.files.list({
      q: `'${rootId}' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    return {
      ok: true,
      rootFolderName: ROOT_FOLDER_NAME,
      folders: (res.data.files || []).map((f: { name?: string }) => f.name || 'unknown'),
    };
  }

  /**
   * Upload a small test image to verify the full pipeline.
   */
  async uploadTestFile(): Promise<DriveUploadResult> {
    const testBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );
    return this.uploadPaymentProof(
      'drive-test',
      'test-connection',
      'TEST0000',
      testBuffer,
      'image/png',
    );
  }

  /**
   * Delete a file by ID (cleanup on failure).
   */
  async deleteFile(fileId: string): Promise<void> {
    if (!this.enabled) return;
    try {
      await this.drive.files.delete({ fileId });
    } catch (err) {
      console.error('[GoogleDrive] Failed to delete file:', fileId, err);
    }
  }

  /**
   * Stream a file's binary content by file ID.
   */
  async getFileStream(fileId: string): Promise<{
    stream: NodeJS.ReadableStream;
    mimeType: string;
  }> {
    if (!this.enabled) {
      throw new Error('Google Drive is not enabled');
    }

    const res = await this.drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' },
    );

    const mimeType =
      res.headers['content-type'] || 'application/octet-stream';

    return {
      stream: res.data as unknown as NodeJS.ReadableStream,
      mimeType,
    };
  }

  /**
   * Get file metadata (name, mimeType, size).
   */
  async getFileMetadata(fileId: string): Promise<{
    name: string;
    mimeType: string;
    size?: number;
  }> {
    if (!this.enabled) {
      throw new Error('Google Drive is not enabled');
    }

    const res = await this.drive.files.get({
      fileId,
      fields: 'name, mimeType, size',
    });

    return {
      name: res.data.name || 'unknown',
      mimeType: res.data.mimeType || 'application/octet-stream',
      size: res.data.size ? parseInt(res.data.size, 10) : undefined,
    };
  }
}

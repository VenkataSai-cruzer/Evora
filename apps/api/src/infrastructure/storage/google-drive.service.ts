import { google } from 'googleapis';
import { Readable } from 'stream';
import crypto from 'crypto';

const PAYMENT_PROOF_FOLDER_NAME = '7 NOTES/Payments';

interface DriveUploadResult {
  fileId: string;
  viewUrl: string;
  downloadUrl?: string;
}

/**
 * Google Drive client for payment proof storage.
 * Uses service account credentials from GOOGLE_SERVICE_ACCOUNT_KEY_JSON env var.
 */
export class GoogleDriveService {
  private drive;
  constructor() {
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;
    if (!keyJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_JSON is not set');
    }

    let credentials;
    try {
      credentials = JSON.parse(keyJson);
    } catch {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_JSON is not valid JSON');
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
   * 7 NOTES/Payments/{event-slug}/{order-number}/
   */
  private async ensurePaymentProofFolder(eventSlug: string, orderNumber: string): Promise<string> {
    const rootFolderId = await this.findOrCreateFolder(PAYMENT_PROOF_FOLDER_NAME, undefined);
    const eventFolderId = await this.findOrCreateFolder(eventSlug, rootFolderId);
    const orderFolderId = await this.findOrCreateFolder(orderNumber, eventFolderId);
    return orderFolderId;
  }

  /**
   * Find or create a folder by name under a parent.
   */
  private async findOrCreateFolder(name: string, parentId?: string): Promise<string> {
    const query = parentId
      ? `mimeType='application/vnd.google-apps.folder' and name='${name}' and '${parentId}' in parents and trashed=false`
      : `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`;

    const res = await this.drive.files.list({
      q: query,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (res.data.files && res.data.files.length > 0) {
      return res.data.files[0].id!;
    }

    // Create folder
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
   */
  async uploadPaymentProof(
    eventSlug: string,
    orderNumber: string,
    fileName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<DriveUploadResult> {
    const folderId = await this.ensurePaymentProofFolder(eventSlug, orderNumber);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const storedFileName = `${timestamp}-${randomSuffix}-${fileName}`;

    const stream = Readable.from(buffer);

    const res = await this.drive.files.create({
      requestBody: {
        name: storedFileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id, webViewLink',
    });

    const fileId = res.data.id!;
    const viewUrl = res.data.webViewLink!;

    // Make the file viewable by anyone with the link (optional, only if needed)
    // await this.drive.permissions.create({
    //   fileId,
    //   requestBody: {
    //     role: 'reader',
    //     type: 'anyone',
    //   },
    // });

    return {
      fileId,
      viewUrl,
    };
  }

  /**
   * Delete a file by ID (cleanup on failure).
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({ fileId });
    } catch (err) {
      console.error('[GoogleDrive] Failed to delete file:', fileId, err);
    }
  }

  /**
   * Get a signed/temporary download URL for a file.
   * Note: Google Drive doesn't support signed URLs like S3.
   * Use webViewLink or webContentLink instead.
   */
  async getDownloadUrl(fileId: string): Promise<string> {
    const res = await this.drive.files.get({
      fileId,
      fields: 'webContentLink',
    });
    return res.data.webContentLink || '';
  }
}

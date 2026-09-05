import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';
import { config } from '../../../config/env';

export interface UploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  error?: string;
}

const s3Client = new S3Client({
  region: 'auto',
  endpoint: config.r2.endpoint,
  credentials: {
    accessKeyId: config.r2.accessKeyId,
    secretAccessKey: config.r2.secretAccessKey,
  },
});

const STORAGE_BUCKET = config.r2.bucketName;
let PUBLIC_DOMAIN = config.r2.publicDomain;

// Ensure PUBLIC_DOMAIN has a protocol (http/https)
if (PUBLIC_DOMAIN && !PUBLIC_DOMAIN.startsWith('http')) {
  PUBLIC_DOMAIN = `https://${PUBLIC_DOMAIN}`;
}

if (!STORAGE_BUCKET || !PUBLIC_DOMAIN) {
  console.warn('[StorageService] Missing R2_BUCKET_NAME or R2_PUBLIC_DOMAIN in environment variables.');
}



/**
 * StorageService
 *
 * Cloud-enabled file storage service using Cloudflare R2.
 * All files are uploaded to the configured R2 bucket via S3 API.
 */
class StorageService {

  /**
   * Generic upload: stores a file buffer into Cloudflare R2 and returns its public URL.
   * @param buffer - file data
   * @param key    - a unique filename path like 'blouse-gallery/image-123.jpg'
   * @param contentType - MIME type of the file e.g. 'image/jpeg'
   */
  async uploadFile(buffer: Buffer, key: string, contentType: string): Promise<string> {
    try {
      await s3Client.send(
        new PutObjectCommand({
          Bucket: STORAGE_BUCKET,
          Key: key,
          Body: buffer,
          ContentType: contentType,
        })
      );

      // Return the public CDN URL
      return `${PUBLIC_DOMAIN.replace(/\/$/, '')}/${key}`;
    } catch (error: any) {
      console.error('[StorageService] R2 upload error:', error.message);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload a single Multer file to R2.
   * @param file       - multer file object (buffer-based: use multer.memoryStorage())
   * @param folder     - sub-folder in the bucket (e.g., 'blouse-gallery', 'banners')
   */
  async uploadMulterFile(file: Express.Multer.File, folder: string): Promise<UploadResult> {
    try {
      const ext = path.extname(file.originalname) || '.jpg';
      const uniqueName = `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const key = `${folder}/${uniqueName}`;

      const url = await this.uploadFile(file.buffer, key, file.mimetype);

      return { success: true, url, fileName: uniqueName };
    } catch (error: any) {
      console.error('[StorageService] uploadMulterFile error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload voice note (in-memory) to R2.
   */
  async uploadVoiceNote(file: Express.Multer.File): Promise<UploadResult> {
    return this.uploadMulterFile(file, 'order-voice');
  }

  /**
   * Upload order attachment to R2.
   */
  async uploadAttachment(file: Express.Multer.File): Promise<UploadResult> {
    return this.uploadMulterFile(file, 'orders');
  }

  /**
   * Delete a file from R2 by its public URL.
   */
  async deleteFile(url: string): Promise<boolean> {
    try {
      const baseUrl = PUBLIC_DOMAIN.replace(/\/$/, '');
      if (!url.startsWith(baseUrl)) {
        console.warn('[StorageService] URL does not match public domain, cannot delete:', url);
        return false;
      }

      // Extract the key by removing the public domain portion
      const key = url.slice(baseUrl.length + 1); // +1 to remove leading slash

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: STORAGE_BUCKET,
          Key: key,
        })
      );

      return true;
    } catch (error: any) {
      console.error('[StorageService] deleteFile error:', error.message);
      return false;
    }
  }

  // Backward compatibility alias
  async deleteVoiceNote(url: string): Promise<boolean> {
    return this.deleteFile(url);
  }
}

export const storageService = new StorageService();


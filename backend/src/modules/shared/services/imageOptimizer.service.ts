import sharp from 'sharp';
import { storageService } from './storage.service';
import { v4 as uuidv4 } from 'uuid';

export interface OptimizedImages {
    url: string;        // Full size (1200px max)
    urlMedium: string;  // Medium (800px max)
    urlThumb: string;   // Thumbnail (200px max)
}

const QUALITY = 80;
const STATIC_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const GIF_MIME_TYPE = 'image/gif';
const ALLOWED_MIME_TYPES = [...STATIC_MIME_TYPES, GIF_MIME_TYPE];

/**
 * Validate, optimize (Sharp → WebP), and upload an image to storage.
 * GIFs are uploaded raw (Sharp cannot preserve animation).
 * Static images get 3 sizes: thumb, medium, full (all WebP).
 */
export const imageOptimizerService = {
    async optimizeAndUpload(
        buffer: Buffer,
        mimetype: string,
        folder: string
    ): Promise<OptimizedImages> {
        if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
            throw new Error(`Invalid file type: ${mimetype}. Allowed: jpeg, png, webp, gif`);
        }

        const fileId = uuidv4();

        // ── GIF bypass: upload raw without touching animation ──────────────
        if (mimetype === GIF_MIME_TYPE) {
            const gifPath = `${folder}/${fileId}.gif`;
            const gifUrl = await storageService.uploadFile(buffer, gifPath, 'image/gif');
            // Return the same URL for all sizes — GIF is used as-is
            return { url: gifUrl, urlMedium: gifUrl, urlThumb: gifUrl };
        }

        // ── Static images: resize + convert to WebP ─────────────────────────
        const [fullBuffer, mediumBuffer, thumbBuffer] = await Promise.all([
            sharp(buffer)
                .resize({ width: 1200, withoutEnlargement: true })
                .webp({ quality: QUALITY })
                .toBuffer(),
            sharp(buffer)
                .resize({ width: 800, withoutEnlargement: true })
                .webp({ quality: QUALITY })
                .toBuffer(),
            sharp(buffer)
                .resize({ width: 200, withoutEnlargement: true })
                .webp({ quality: QUALITY })
                .toBuffer(),
        ]);

        const [url, urlMedium, urlThumb] = await Promise.all([
            storageService.uploadFile(
                fullBuffer,
                `${folder}/${fileId}.webp`,
                'image/webp'
            ),
            storageService.uploadFile(
                mediumBuffer,
                `${folder}/medium/${fileId}.webp`,
                'image/webp'
            ),
            storageService.uploadFile(
                thumbBuffer,
                `${folder}/thumb/${fileId}.webp`,
                'image/webp'
            ),
        ]);

        return { url, urlMedium, urlThumb };
    },

    /**
     * Optimize a single image to WebP format.
     * GIFs bypass this (returned as-is with animation preserved).
     */
    async optimizeSingleImage(
        buffer: Buffer,
        mimetype: string,
        maxWidth = 1200
    ): Promise<{ buffer: Buffer; mimetype: string }> {
        if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
            throw new Error(`Invalid file type: ${mimetype}. Allowed: jpeg, png, webp, gif`);
        }

        // GIF bypass — return raw to preserve animation
        if (mimetype === GIF_MIME_TYPE) {
            return { buffer, mimetype: 'image/gif' };
        }

        const optimized = await sharp(buffer)
            .resize({ width: maxWidth, withoutEnlargement: true })
            .webp({ quality: QUALITY })
            .toBuffer();

        return { buffer: optimized, mimetype: 'image/webp' };
    },
};

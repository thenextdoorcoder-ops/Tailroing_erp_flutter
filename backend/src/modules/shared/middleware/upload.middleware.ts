import multer from 'multer';
import path from 'path';

const GIF_MAX_SIZE = 5 * 1024 * 1024; // 5MB — GIFs need more room for animation frames
const IMG_MAX_SIZE = 1 * 1024 * 1024; // 1MB — static images (get compressed to WebP anyway)

// File filter — images + GIFs allowed
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

/**
 * Multer middleware configured with in-memory storage.
 * Files are held as Buffer objects in req.file.buffer.
 * The StorageService then uploads these buffers to Supabase Storage.
 *
 * File size limits:
 *  - GIF  → 5 MB (animation frames make them larger)
 *  - Other images → 1 MB (they get compressed to WebP anyway)
 *
 * NOTE: We no longer use diskStorage here because disk files on Render
 * (and most cloud hosts) are ephemeral — they disappear on every deploy.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: GIF_MAX_SIZE, // upper bound; controller can enforce tighter limits for non-GIF
  },
});

/**
 * A stricter upload instance for contexts where GIF is NOT expected (e.g. payment proofs).
 * Keeps the original 1MB cap.
 */
export const uploadStrict = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    if (allowedTypes.test(path.extname(file.originalname).toLowerCase()) && allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only jpeg, jpg, png, webp allowed here'));
    }
  },
  limits: { fileSize: IMG_MAX_SIZE },
});

import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';

const dir = 'uploads/payment-proofs';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Allowed MIME types mapped to their magic byte signatures
const ALLOWED_MIME_SIGNATURES: Record<string, Buffer[]> = {
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47])],
  'image/webp': [Buffer.from('RIFF'), Buffer.from('WEBP')],
};

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) => {
    // Use cryptographically random UUID — not guessable or enumerable
    const ext = MIME_TO_EXT[file.mimetype] || '.jpg';
    cb(null, `proof-${crypto.randomUUID()}${ext}`);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!ALLOWED_MIME_SIGNATURES[file.mimetype]) {
    return cb(new Error('Only JPEG, PNG, WebP images allowed'));
  }
  cb(null, true);
};

export const paymentProofUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 1 * 1024 * 1024 },
}).single('proof');

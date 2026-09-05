import multer from 'multer';

/**
 * Voice Upload Middleware
 * 
 * Uses memory storage to keep files in buffer.
 * This allows flexibility to:
 * - Save to local file system
 * - Upload directly to cloud storage
 * - No temporary file cleanup needed
 */

const storage = multer.memoryStorage();

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Accept only audio files
  const allowedMimes = [
    'audio/webm',
    'audio/wav',
    'audio/mp3',
    'audio/mpeg',
    'audio/ogg',
    'audio/m4a',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only audio files are allowed.'));
  }
};

export const voiceUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB max
  },
});
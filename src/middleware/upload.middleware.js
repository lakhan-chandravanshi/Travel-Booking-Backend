import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
]);

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

// Keep files in memory — we stream them straight to S3, never to local disk.
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.has(file.mimetype)) return cb(null, true);
    cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}. Upload PDF or image files.`));
  },
});

export { MAX_FILE_SIZE };
export default upload;

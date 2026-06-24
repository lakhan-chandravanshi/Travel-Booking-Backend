// Import the library entry directly — pdf-parse's index file runs demo code
// when imported as an ESM default, which we want to avoid.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import { logger } from '../utils/logger.js';

/**
 * Pull raw text out of a document buffer where possible.
 *  - PDFs are parsed with pdf-parse.
 *  - Images return an empty string here; the multimodal AI providers read
 *    the image bytes directly during extraction instead.
 */
export async function extractText({ buffer, mimeType }) {
  try {
    if (mimeType === 'application/pdf') {
      const data = await pdfParse(buffer);
      return (data.text || '').trim();
    }
  } catch (err) {
    logger.warn(`Text extraction failed: ${err.message}`);
  }
  return '';
}

export const isImage = (mimeType) => typeof mimeType === 'string' && mimeType.startsWith('image/');
export const isPdf = (mimeType) => mimeType === 'application/pdf';

export default { extractText, isImage, isPdf };

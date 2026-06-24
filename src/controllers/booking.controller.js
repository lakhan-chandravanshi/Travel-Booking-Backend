import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Booking, DOCUMENT_TYPES } from '../models/Booking.js';
import { uploadFile, deleteFile } from '../services/storage.service.js';
import { extractText } from '../services/extraction.service.js';
import * as ai from '../services/ai/index.js';
import { logger } from '../utils/logger.js';

/** Map a raw AI extraction object onto our Booking.extractedData schema. */
function normaliseExtraction(raw = {}) {
  const type = DOCUMENT_TYPES.includes(raw.type) ? raw.type : 'other';
  const toDate = (v) => {
    if (!v) return undefined;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };
  return {
    type,
    title: raw.title || undefined,
    provider: raw.provider || undefined,
    confirmationNumber: raw.confirmationNumber || undefined,
    from: raw.from || {},
    to: raw.to || {},
    startDateTime: toDate(raw.startDateTime),
    endDateTime: toDate(raw.endDateTime),
    location: raw.location || undefined,
    travelers: Array.isArray(raw.travelers) ? raw.travelers.filter(Boolean) : [],
    seat: raw.seat || undefined,
    gate: raw.gate || undefined,
    terminal: raw.terminal || undefined,
    price: raw.price && (raw.price.amount != null || raw.price.currency)
      ? { amount: raw.price.amount ?? undefined, currency: raw.price.currency ?? undefined }
      : undefined,
    notes: raw.notes || undefined,
  };
}

/** Process a single uploaded file: store it, then extract structured data. */
async function processFile(file, userId) {
  const { buffer, originalname, mimetype, size } = file;

  // 1) Persist the original document (S3 or local fallback).
  const stored = await uploadFile({
    buffer,
    originalName: originalname,
    mimeType: mimetype,
    userId,
  });

  // 2) Create the booking record immediately so the upload is never lost,
  //    even if AI extraction fails afterwards.
  const booking = await Booking.create({
    user: userId,
    fileName: originalname,
    fileUrl: stored.url,
    fileKey: stored.key,
    fileType: mimetype,
    fileSize: size,
    storage: stored.storage,
    status: 'processing',
  });

  // 3) Extract text + structured data with the AI layer.
  try {
    const rawText = await extractText({ buffer, mimeType: mimetype });
    const raw = await ai.extractBookingData({
      rawText,
      buffer,
      mimeType: mimetype,
      fileName: originalname,
    });
    const extractedData = normaliseExtraction(raw);

    booking.extractedData = extractedData;
    booking.documentType = extractedData.type;
    booking.rawText = rawText?.slice(0, 20000);
    booking.status = 'extracted';
    await booking.save();
  } catch (err) {
    logger.error(`Extraction failed for ${originalname}: ${err.message}`);
    booking.status = 'failed';
    booking.error = err.message;
    await booking.save();
  }

  return booking;
}

// POST /api/v1/bookings/upload   (multipart: field "files")
export const uploadBookings = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw ApiError.badRequest('No files uploaded. Attach at least one PDF or image.');

  // Process concurrently but never let one bad file fail the whole batch.
  const results = await Promise.allSettled(files.map((f) => processFile(f, req.user._id)));
  const bookings = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const failed = results.filter((r) => r.status === 'rejected');

  if (!bookings.length) throw ApiError.internal('All uploads failed to process');

  res.status(201).json({
    success: true,
    message: `Processed ${bookings.length} document${bookings.length === 1 ? '' : 's'}`,
    data: { bookings, failedCount: failed.length },
  });
});

// GET /api/v1/bookings
export const listBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: { bookings } });
});

// GET /api/v1/bookings/:id
export const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, user: req.user._id });
  if (!booking) throw ApiError.notFound('Booking not found');
  res.json({ success: true, data: { booking } });
});

// DELETE /api/v1/bookings/:id
export const deleteBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!booking) throw ApiError.notFound('Booking not found');
  // Fire-and-forget removal of the stored object.
  deleteFile(booking.fileKey, booking.storage);
  res.json({ success: true, message: 'Booking deleted' });
});

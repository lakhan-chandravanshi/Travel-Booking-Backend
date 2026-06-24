import mongoose from 'mongoose';

export const DOCUMENT_TYPES = [
  'flight',
  'hotel',
  'train',
  'bus',
  'car_rental',
  'cruise',
  'activity',
  'other',
];

/** Structured data extracted from a single travel document by the AI layer. */
const extractedDataSchema = new mongoose.Schema(
  {
    type: { type: String, enum: DOCUMENT_TYPES, default: 'other' },
    title: String, // e.g. "Delhi → Goa" or "Taj Resort & Spa"
    provider: String, // airline / hotel / operator name
    confirmationNumber: String,
    from: {
      name: String,
      code: String, // airport / station code
      city: String,
      country: String,
    },
    to: {
      name: String,
      code: String,
      city: String,
      country: String,
    },
    startDateTime: Date,
    endDateTime: Date,
    location: String,
    travelers: [String],
    seat: String,
    gate: String,
    terminal: String,
    price: {
      amount: Number,
      currency: String,
    },
    notes: String,
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: { type: String, required: true },
    fileUrl: { type: String, required: true }, // S3 (or local) URL
    fileKey: { type: String }, // S3 object key for later deletion
    fileType: { type: String }, // mime type
    fileSize: { type: Number },
    storage: { type: String, enum: ['s3', 'local'], default: 's3' },

    documentType: { type: String, enum: DOCUMENT_TYPES, default: 'other' },
    status: {
      type: String,
      enum: ['processing', 'extracted', 'failed'],
      default: 'processing',
      index: true,
    },
    extractedData: extractedDataSchema,
    rawText: { type: String, select: false }, // raw OCR / parsed text (large)
    error: String,
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, createdAt: -1 });

export const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;

import mongoose from 'mongoose';
import { customAlphabet } from 'nanoid';

// URL-friendly slug for public sharing (e.g. /trip/8Kd2mQ9xZr).
const slugId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 12);

const itemSchema = new mongoose.Schema(
  {
    time: String, // "09:30" or "Morning"
    type: { type: String, default: 'activity' }, // flight | hotel | activity | meal | transport ...
    title: { type: String, required: true },
    description: String,
    location: String,
    bookingRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  },
  { _id: false }
);

const daySchema = new mongoose.Schema(
  {
    dayNumber: Number,
    date: Date,
    title: String, // "Arrival in Goa"
    summary: String,
    items: [itemSchema],
  },
  { _id: false }
);

const itinerarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    destination: String,
    summary: String,
    startDate: Date,
    endDate: Date,
    coverEmoji: { type: String, default: '✈️' },
    tags: [String],

    bookings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }],
    days: [daySchema],
    tips: [String],
    packingList: [String],

    status: {
      type: String,
      enum: ['generating', 'ready', 'failed'],
      default: 'ready',
    },

    share: {
      isPublic: { type: Boolean, default: false },
      slug: { type: String, unique: true, sparse: true, index: true },
      sharedAt: Date,
      views: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

itinerarySchema.index({ user: 1, createdAt: -1 });

/** Ensure a slug exists and flip the itinerary to public. */
itinerarySchema.methods.enablePublicSharing = function enablePublicSharing() {
  if (!this.share.slug) this.share.slug = slugId();
  this.share.isPublic = true;
  this.share.sharedAt = new Date();
  return this.share.slug;
};

export const Itinerary = mongoose.model('Itinerary', itinerarySchema);
export default Itinerary;

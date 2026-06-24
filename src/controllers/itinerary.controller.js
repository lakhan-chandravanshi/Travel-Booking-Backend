import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Booking } from '../models/Booking.js';
import { Itinerary } from '../models/Itinerary.js';
import * as ai from '../services/ai/index.js';

/** Reduce a Booking document to the compact shape the AI planner expects. */
function toPlannerInput(b) {
  const e = b.extractedData || {};
  return {
    id: b._id.toString(),
    type: e.type || b.documentType,
    title: e.title,
    provider: e.provider,
    confirmationNumber: e.confirmationNumber,
    from: e.from,
    to: e.to,
    location: e.location,
    startDateTime: e.startDateTime,
    endDateTime: e.endDateTime,
    travelers: e.travelers,
    notes: e.notes,
  };
}

const toDate = (v) => {
  if (!v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/** Map raw AI itinerary output onto the Itinerary schema. */
function buildItineraryDoc(raw, { userId, bookingIds }) {
  const days = Array.isArray(raw.days)
    ? raw.days.map((d, i) => ({
        dayNumber: d.dayNumber || i + 1,
        date: toDate(d.date),
        title: d.title || `Day ${i + 1}`,
        summary: d.summary,
        items: Array.isArray(d.items)
          ? d.items
              .filter((it) => it && it.title)
              .map((it) => ({
                time: it.time,
                type: it.type || 'activity',
                title: it.title,
                description: it.description,
                location: it.location,
              }))
          : [],
      }))
    : [];

  return {
    user: userId,
    title: raw.title || 'My Trip',
    destination: raw.destination,
    summary: raw.summary,
    startDate: toDate(raw.startDate),
    endDate: toDate(raw.endDate),
    coverEmoji: raw.coverEmoji || '✈️',
    tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 8) : [],
    bookings: bookingIds,
    days,
    tips: Array.isArray(raw.tips) ? raw.tips.slice(0, 8) : [],
    packingList: Array.isArray(raw.packingList) ? raw.packingList.slice(0, 12) : [],
    status: 'ready',
  };
}

// POST /api/v1/itineraries/generate
export const generateItinerary = asyncHandler(async (req, res) => {
  const { bookingIds, title } = req.body;

  const query = { user: req.user._id, status: 'extracted' };
  if (bookingIds?.length) query._id = { $in: bookingIds };

  const bookings = await Booking.find(query).sort({ 'extractedData.startDateTime': 1 });
  if (!bookings.length) {
    throw ApiError.badRequest(
      'No processed bookings found to build an itinerary. Upload and process documents first.'
    );
  }

  const raw = await ai.generateItinerary(bookings.map(toPlannerInput));
  const doc = buildItineraryDoc(raw, {
    userId: req.user._id,
    bookingIds: bookings.map((b) => b._id),
  });
  if (title) doc.title = title;

  const itinerary = await Itinerary.create(doc);
  res.status(201).json({ success: true, data: { itinerary } });
});

// GET /api/v1/itineraries  (history)
export const listItineraries = asyncHandler(async (req, res) => {
  const itineraries = await Itinerary.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .select('-days.items'); // lighter list payload; full detail on GET :id
  res.json({ success: true, data: { itineraries } });
});

// GET /api/v1/itineraries/:id
export const getItinerary = asyncHandler(async (req, res) => {
  const itinerary = await Itinerary.findOne({ _id: req.params.id, user: req.user._id }).populate(
    'bookings',
    'fileName fileUrl fileType documentType extractedData'
  );
  if (!itinerary) throw ApiError.notFound('Itinerary not found');
  res.json({ success: true, data: { itinerary } });
});

// PATCH /api/v1/itineraries/:id
export const updateItinerary = asyncHandler(async (req, res) => {
  const itinerary = await Itinerary.findOneAndUpdate(
    { _id: req.params.id, user: req.user._id },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!itinerary) throw ApiError.notFound('Itinerary not found');
  res.json({ success: true, data: { itinerary } });
});

// DELETE /api/v1/itineraries/:id
export const deleteItinerary = asyncHandler(async (req, res) => {
  const deleted = await Itinerary.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!deleted) throw ApiError.notFound('Itinerary not found');
  res.json({ success: true, message: 'Itinerary deleted' });
});

// POST /api/v1/itineraries/:id/share   { isPublic: boolean }
export const toggleShare = asyncHandler(async (req, res) => {
  const itinerary = await Itinerary.findOne({ _id: req.params.id, user: req.user._id });
  if (!itinerary) throw ApiError.notFound('Itinerary not found');

  if (req.body.isPublic) {
    itinerary.enablePublicSharing();
  } else {
    itinerary.share.isPublic = false;
  }
  await itinerary.save();

  res.json({
    success: true,
    data: {
      isPublic: itinerary.share.isPublic,
      slug: itinerary.share.slug,
      sharePath: itinerary.share.slug ? `/trip/${itinerary.share.slug}` : null,
    },
  });
});

// GET /api/v1/public/itineraries/:slug   (no auth)
export const getPublicItinerary = asyncHandler(async (req, res) => {
  const itinerary = await Itinerary.findOneAndUpdate(
    { 'share.slug': req.params.slug, 'share.isPublic': true },
    { $inc: { 'share.views': 1 } },
    { new: true }
  )
    .populate('user', 'name avatarColor')
    .select('-bookings');

  if (!itinerary) throw ApiError.notFound('This itinerary is private or does not exist');
  res.json({ success: true, data: { itinerary } });
});

/**
 * Deterministic, key-free provider used when AI_PROVIDER=mock.
 *
 * Extraction makes a best-effort guess from the document text / filename, and
 * itinerary generation builds a genuine chronological day-by-day plan from the
 * supplied bookings — so reviewers can experience the entire product end to end
 * without any API credentials.
 */

const DOC_HINTS = [
  { type: 'flight', words: ['flight', 'airlines', 'airways', 'boarding', 'pnr', 'gate', 'departure'] },
  { type: 'hotel', words: ['hotel', 'resort', 'check-in', 'checkin', 'check out', 'nights', 'room', 'guest'] },
  { type: 'train', words: ['train', 'railway', 'irctc', 'coach', 'platform'] },
  { type: 'bus', words: ['bus', 'volvo', 'sleeper', 'boarding point'] },
  { type: 'car_rental', words: ['car rental', 'pick-up', 'drop-off', 'vehicle', 'avis', 'hertz', 'zoomcar'] },
  { type: 'cruise', words: ['cruise', 'cabin', 'deck', 'ship'] },
  { type: 'activity', words: ['ticket', 'tour', 'museum', 'entry', 'experience'] },
];

function guessType(text = '') {
  const t = text.toLowerCase();
  for (const hint of DOC_HINTS) {
    if (hint.words.some((w) => t.includes(w))) return hint.type;
  }
  return 'other';
}

const TYPE_SAMPLE = {
  flight: {
    title: 'Delhi → Goa',
    provider: 'IndiGo',
    from: { code: 'DEL', city: 'New Delhi', country: 'India' },
    to: { code: 'GOI', city: 'Goa', country: 'India' },
    location: 'Indira Gandhi International Airport (T2)',
    notes: 'Web check-in opens 48h before departure.',
  },
  hotel: {
    title: 'The Taj Holiday Village Resort & Spa',
    provider: 'Taj Hotels',
    to: { city: 'Goa', country: 'India' },
    location: 'Sinquerim, North Goa',
    notes: 'Breakfast included. Check-in 14:00, check-out 11:00.',
  },
  other: {
    title: 'Travel Booking',
    provider: 'Trip Provider',
    location: 'Goa, India',
    notes: 'Imported travel document.',
  },
};

function addHours(base, hours) {
  return new Date(base.getTime() + hours * 3600 * 1000);
}

export async function extractBookingData({ rawText, fileName }) {
  const type = guessType(`${rawText || ''} ${fileName || ''}`);
  const sample = TYPE_SAMPLE[type] || TYPE_SAMPLE.other;

  // Anchor sample dates a few weeks out so the generated itinerary looks live.
  const base = new Date();
  base.setDate(base.getDate() + 21);
  base.setHours(9, 30, 0, 0);

  const isStay = type === 'hotel' || type === 'cruise';
  return {
    type,
    confirmationNumber: `MOCK-${Math.floor(100000 + (rawText?.length || 7) * 137) % 999999}`,
    startDateTime: base.toISOString(),
    endDateTime: (isStay ? addHours(base, 24 * 4) : addHours(base, 2.5)).toISOString(),
    travelers: ['Guest Traveller'],
    price: { amount: isStay ? 24000 : 6499, currency: 'INR' },
    from: {},
    to: {},
    ...sample,
  };
}

export async function generateItinerary(bookings) {
  const sorted = [...bookings].sort(
    (a, b) => new Date(a.startDateTime || 0) - new Date(b.startDateTime || 0)
  );
  const dates = sorted.map((b) => b.startDateTime).filter(Boolean).map((d) => new Date(d));
  const start = dates[0] || new Date();
  const endCandidates = sorted
    .map((b) => b.endDateTime || b.startDateTime)
    .filter(Boolean)
    .map((d) => new Date(d));
  const end = endCandidates.sort((a, b) => b - a)[0] || start;

  const destination =
    sorted.find((b) => b.to?.city)?.to?.city ||
    sorted.find((b) => b.location)?.location ||
    'your destination';

  const dayCount = Math.max(1, Math.round((end - start) / (24 * 3600 * 1000)) + 1);
  const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

  const days = [];
  for (let i = 0; i < dayCount; i += 1) {
    const date = new Date(start.getTime() + i * 24 * 3600 * 1000);
    const items = sorted
      .filter((b) => b.startDateTime && dayKey(b.startDateTime) === dayKey(date))
      .map((b) => ({
        time: new Date(b.startDateTime).toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        type: b.type || 'activity',
        title: b.title || b.provider || 'Booking',
        description: b.notes || `${b.provider || ''} ${b.confirmationNumber || ''}`.trim(),
        location: b.location || b.to?.city || null,
      }));

    if (i === 0) {
      items.push({
        time: 'Evening',
        type: 'meal',
        title: 'Welcome dinner',
        description: `Settle in and enjoy local cuisine in ${destination}.`,
        location: destination,
      });
    }
    days.push({
      dayNumber: i + 1,
      date: date.toISOString(),
      title: i === 0 ? `Arrival in ${destination}` : i === dayCount - 1 ? 'Departure day' : `Exploring ${destination}`,
      summary: i === 0 ? 'Arrive, check in and relax.' : 'A balanced day of sights and leisure.',
      items: items.length ? items : [
        {
          time: 'Morning',
          type: 'activity',
          title: 'Free exploration',
          description: `Discover the highlights of ${destination} at your own pace.`,
          location: destination,
        },
      ],
    });
  }

  return {
    title: `${dayCount} ${dayCount === 1 ? 'Day' : 'Days'} in ${destination}`,
    destination,
    summary: `An auto-generated plan built from ${bookings.length} booking${bookings.length === 1 ? '' : 's'}, covering ${dayCount} day${dayCount === 1 ? '' : 's'} in ${destination}.`,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    coverEmoji: '🌴',
    tags: ['getaway', 'leisure'],
    days,
    tips: [
      `Carry a valid photo ID for all check-ins in ${destination}.`,
      'Keep digital and printed copies of every booking confirmation.',
      'Arrive at the airport at least 2 hours before domestic departures.',
      'Stay hydrated and keep some local cash for small vendors.',
    ],
    packingList: ['Comfortable walking shoes', 'Sunscreen & sunglasses', 'Universal power adapter', 'Light layers', 'Reusable water bottle', 'Travel documents folder'],
  };
}

export default { extractBookingData, generateItinerary };

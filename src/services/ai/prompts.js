import { DOCUMENT_TYPES } from '../../models/Booking.js';

/** Shared JSON-only instruction used to coax clean output from any model. */
export const JSON_ONLY = 'Respond with ONLY valid minified JSON. No markdown, no code fences, no commentary.';

export const extractionPrompt = (rawText) => `
You are a travel document parser. Extract structured booking information from the
provided travel document (it may be a flight ticket, hotel booking, train/bus ticket,
car rental, cruise, or activity voucher).

${rawText ? `Document text:\n"""\n${rawText.slice(0, 8000)}\n"""` : 'The document is provided as an image/file. Read it carefully.'}

Return JSON with EXACTLY this shape (use null for anything you cannot find):
{
  "type": one of ${JSON.stringify(DOCUMENT_TYPES)},
  "title": short human label e.g. "Delhi → Goa" or "The Taj Resort",
  "provider": airline / hotel / operator name or null,
  "confirmationNumber": booking/PNR/confirmation code or null,
  "from": { "name": string|null, "code": string|null, "city": string|null, "country": string|null },
  "to":   { "name": string|null, "code": string|null, "city": string|null, "country": string|null },
  "startDateTime": ISO 8601 datetime or null (departure / check-in / start),
  "endDateTime": ISO 8601 datetime or null (arrival / check-out / end),
  "location": free-text location or null,
  "travelers": array of passenger/guest names (may be empty),
  "seat": string|null, "gate": string|null, "terminal": string|null,
  "price": { "amount": number|null, "currency": 3-letter code|null },
  "notes": any other useful detail or null
}

${JSON_ONLY}
`.trim();

export const itineraryPrompt = (bookings) => `
You are an expert travel planner. Using the confirmed bookings below, produce a
clear, well-paced, day-by-day travel itinerary. Order events chronologically,
group them by day, and intelligently fill realistic free time with relevant local
suggestions (sightseeing, food, rest) WITHOUT inventing fake bookings. Reference the
real bookings where they belong.

Confirmed bookings (JSON):
${JSON.stringify(bookings, null, 2)}

Return JSON with EXACTLY this shape:
{
  "title": catchy trip title e.g. "5 Days in Coastal Goa",
  "destination": primary destination,
  "summary": 1-2 sentence trip overview,
  "startDate": ISO date or null,
  "endDate": ISO date or null,
  "coverEmoji": a single emoji that fits the trip,
  "tags": array of 2-4 short theme tags e.g. ["beach","relaxation"],
  "days": [
    {
      "dayNumber": 1,
      "date": ISO date or null,
      "title": short day title,
      "summary": one-line summary of the day,
      "items": [
        {
          "time": "HH:MM" or "Morning"/"Afternoon"/"Evening",
          "type": "flight"|"hotel"|"train"|"transport"|"activity"|"meal"|"checkin"|"checkout",
          "title": short label,
          "description": one helpful sentence,
          "location": place or null
        }
      ]
    }
  ],
  "tips": array of 3-5 short, practical, destination-specific tips,
  "packingList": array of 5-8 packing suggestions tailored to the trip
}

${JSON_ONLY}
`.trim();

/**
 * Seed a demo account so the deployed app has something to show immediately.
 *
 *   npm run seed
 *
 * Creates (or resets) demo@trrip.app / demo1234 with two bookings and one
 * shared itinerary. Safe to run repeatedly — it clears the demo user's data
 * first. No AI calls are made; the sample data is inserted directly.
 */
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Booking } from '../models/Booking.js';
import { Itinerary } from '../models/Itinerary.js';
import { logger } from '../utils/logger.js';

const DEMO_EMAIL = 'demo@trrip.app';

async function run() {
  await connectDB();

  await User.deleteOne({ email: DEMO_EMAIL });
  const existing = await User.findOne({ email: DEMO_EMAIL });
  if (existing) {
    await Booking.deleteMany({ user: existing._id });
    await Itinerary.deleteMany({ user: existing._id });
  }

  const user = await User.create({
    name: 'Demo Traveller',
    email: DEMO_EMAIL,
    password: 'demo1234',
  });

  const base = new Date();
  base.setDate(base.getDate() + 14);
  base.setHours(8, 15, 0, 0);
  const checkout = new Date(base.getTime() + 4 * 24 * 3600 * 1000);

  const flight = await Booking.create({
    user: user._id,
    fileName: 'indigo-DEL-GOI.pdf',
    fileUrl: 'https://example.com/sample/indigo-DEL-GOI.pdf',
    fileType: 'application/pdf',
    storage: 'local',
    status: 'extracted',
    documentType: 'flight',
    extractedData: {
      type: 'flight',
      title: 'Delhi → Goa',
      provider: 'IndiGo',
      confirmationNumber: 'INDG7K2',
      from: { code: 'DEL', city: 'New Delhi', country: 'India' },
      to: { code: 'GOI', city: 'Goa', country: 'India' },
      startDateTime: base,
      endDateTime: new Date(base.getTime() + 2.5 * 3600 * 1000),
      seat: '14A',
      price: { amount: 6499, currency: 'INR' },
    },
  });

  const hotel = await Booking.create({
    user: user._id,
    fileName: 'taj-goa-booking.pdf',
    fileUrl: 'https://example.com/sample/taj-goa-booking.pdf',
    fileType: 'application/pdf',
    storage: 'local',
    status: 'extracted',
    documentType: 'hotel',
    extractedData: {
      type: 'hotel',
      title: 'Taj Holiday Village Resort & Spa',
      provider: 'Taj Hotels',
      confirmationNumber: 'TAJ-9921',
      to: { city: 'Goa', country: 'India' },
      location: 'Sinquerim, North Goa',
      startDateTime: base,
      endDateTime: checkout,
      price: { amount: 24000, currency: 'INR' },
    },
  });

  const itinerary = await Itinerary.create({
    user: user._id,
    title: '4 Days in Coastal Goa',
    destination: 'Goa',
    summary: 'A relaxed long weekend of beaches, Portuguese heritage and seafood, built from your flight and hotel bookings.',
    startDate: base,
    endDate: checkout,
    coverEmoji: '🏖️',
    tags: ['beach', 'relaxation', 'food'],
    bookings: [flight._id, hotel._id],
    days: [
      {
        dayNumber: 1,
        date: base,
        title: 'Arrival in Goa',
        summary: 'Land, check in and unwind by the sea.',
        items: [
          { time: '08:15', type: 'flight', title: 'IndiGo DEL → GOI', description: 'Arrive at Goa (Dabolim) airport.', location: 'Goa Airport' },
          { time: '12:00', type: 'checkin', title: 'Check in at Taj Holiday Village', description: 'Drop bags and freshen up.', location: 'Sinquerim, North Goa' },
          { time: 'Evening', type: 'meal', title: 'Beachside seafood dinner', description: 'Sunset dinner at a Sinquerim shack.', location: 'Sinquerim Beach' },
        ],
      },
      {
        dayNumber: 2,
        date: new Date(base.getTime() + 24 * 3600 * 1000),
        title: 'North Goa beaches',
        summary: 'Beach hopping from Baga to Anjuna.',
        items: [
          { time: 'Morning', type: 'activity', title: 'Baga & Calangute', description: 'Water sports and beach time.', location: 'Baga Beach' },
          { time: 'Afternoon', type: 'activity', title: 'Anjuna flea market', description: 'Browse local crafts and street food.', location: 'Anjuna' },
        ],
      },
      {
        dayNumber: 3,
        date: new Date(base.getTime() + 2 * 24 * 3600 * 1000),
        title: 'Old Goa & spice trail',
        summary: 'Heritage churches and a spice plantation lunch.',
        items: [
          { time: 'Morning', type: 'activity', title: 'Basilica of Bom Jesus', description: 'UNESCO World Heritage church.', location: 'Old Goa' },
          { time: 'Afternoon', type: 'activity', title: 'Spice plantation tour', description: 'Guided walk with a traditional lunch.', location: 'Ponda' },
        ],
      },
      {
        dayNumber: 4,
        date: checkout,
        title: 'Departure',
        summary: 'Last morning swim before flying home.',
        items: [
          { time: '11:00', type: 'checkout', title: 'Check out', description: 'Late breakfast and checkout.', location: 'Taj Holiday Village' },
        ],
      },
    ],
    tips: [
      'Rent a scooter for easy, cheap travel around North Goa.',
      'Carry cash for beach shacks and flea markets.',
      'Sundays: visit the Anjuna flea market; it is largest then.',
      'Sunscreen is essential — the midday sun is strong.',
    ],
    packingList: ['Swimwear', 'Sunscreen SPF 50', 'Light cottons', 'Flip-flops', 'Sunglasses', 'Power bank'],
  });

  itinerary.enablePublicSharing();
  await itinerary.save();

  logger.success(`Seeded demo account: ${DEMO_EMAIL} / demo1234`);
  logger.info(`Public itinerary slug: ${itinerary.share.slug}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  logger.error(`Seed failed: ${err.message}`);
  process.exit(1);
});

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import bookingRoutes from './booking.routes.js';
import itineraryRoutes from './itinerary.routes.js';
import { getPublicItinerary } from '../controllers/itinerary.controller.js';
import { aiProviderName } from '../services/ai/index.js';
import { isS3Configured } from '../config/env.js';

const router = Router();

// Health / status — handy for uptime checks and deploy verification.
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    aiProvider: aiProviderName,
    storage: isS3Configured ? 's3' : 'local',
    time: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/bookings', bookingRoutes);
router.use('/itineraries', itineraryRoutes);

// Public, unauthenticated share endpoint.
router.get('/public/itineraries/:slug', getPublicItinerary);

export default router;

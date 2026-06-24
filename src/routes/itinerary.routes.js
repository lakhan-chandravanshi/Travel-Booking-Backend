import { Router } from 'express';
import {
  generateItinerary,
  listItineraries,
  getItinerary,
  updateItinerary,
  deleteItinerary,
  toggleShare,
} from '../controllers/itinerary.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  generateItinerarySchema,
  updateItinerarySchema,
  shareSchema,
} from '../validators/index.js';

const router = Router();

router.use(protect);

router.post('/generate', validate(generateItinerarySchema), generateItinerary);
router.get('/', listItineraries);
router.get('/:id', getItinerary);
router.patch('/:id', validate(updateItinerarySchema), updateItinerary);
router.delete('/:id', deleteItinerary);
router.post('/:id/share', validate(shareSchema), toggleShare);

export default router;

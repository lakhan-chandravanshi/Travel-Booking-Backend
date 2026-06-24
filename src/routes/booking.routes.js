import { Router } from 'express';
import {
  uploadBookings,
  listBookings,
  getBooking,
  deleteBooking,
} from '../controllers/booking.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';

const router = Router();

router.use(protect); // every booking route requires auth

router.post('/upload', upload.array('files', 8), uploadBookings);
router.get('/', listBookings);
router.get('/:id', getBooking);
router.delete('/:id', deleteBooking);

export default router;

import { Router } from 'express';
import {
  getAdminStats,
  listAllReservations,
  listAllSlots,
} from '../controllers/adminController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { adminReservationsQuerySchema } from '../validators/schemas.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/stats', getAdminStats);
router.get(
  '/reservations',
  validate(adminReservationsQuerySchema, 'query'),
  listAllReservations,
);
router.get('/slots', listAllSlots);

export default router;

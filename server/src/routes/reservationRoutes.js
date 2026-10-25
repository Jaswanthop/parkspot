import { Router } from 'express';
import {
  cancelReservation,
  createReservation,
  listMyReservations,
} from '../controllers/reservationController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createReservationSchema,
  myReservationsQuerySchema,
  reservationIdSchema,
} from '../validators/schemas.js';

const router = Router();

router.use(requireAuth);

router.post('/', validate(createReservationSchema), createReservation);
router.get(
  '/mine',
  validate(myReservationsQuerySchema, 'query'),
  listMyReservations,
);
router.patch(
  '/:id/cancel',
  validate(reservationIdSchema, 'params'),
  cancelReservation,
);

export default router;

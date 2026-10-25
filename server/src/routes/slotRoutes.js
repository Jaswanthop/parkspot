import { Router } from 'express';
import {
  createSlot,
  deleteSlot,
  getSlot,
  getSlotStats,
  listSlots,
  updateSlot,
} from '../controllers/slotController.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  slotCreateSchema,
  slotIdSchema,
  slotQuerySchema,
  slotUpdateSchema,
} from '../validators/schemas.js';

const router = Router();

router.get('/stats', getSlotStats);
router.get('/', validate(slotQuerySchema, 'query'), listSlots);
router.get('/:id', validate(slotIdSchema, 'params'), getSlot);

router.post(
  '/',
  requireAuth,
  requireAdmin,
  validate(slotCreateSchema),
  createSlot,
);
router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validate(slotIdSchema, 'params'),
  validate(slotUpdateSchema),
  updateSlot,
);
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  validate(slotIdSchema, 'params'),
  deleteSlot,
);

export default router;

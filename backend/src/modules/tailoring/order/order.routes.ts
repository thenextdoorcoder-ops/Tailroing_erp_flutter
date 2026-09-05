import express from 'express';

import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  updateOrderStatus,
  deleteOrder,
  getPendingOrders,
  getUpcomingDeliveries,
  getOverdueOrders,
  lookupOrderByOrderId,
} from './order.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';
import { validateBody } from '../../shared/middleware/validate.middleware';
import { createTailoringOrderSchema } from '../../shared/validators/schema.validators';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'));

router.get('/', getOrders);
router.get('/pending', getPendingOrders);
router.get('/upcoming-deliveries', getUpcomingDeliveries);
router.get('/overdue', getOverdueOrders);
router.get('/lookup/:orderId', lookupOrderByOrderId);
router.get('/:id', getOrderById);
router.post('/', validateBody(createTailoringOrderSchema), createOrder);
router.put('/:id', updateOrder);
router.patch('/:id/status', updateOrderStatus);
router.delete('/:id', deleteOrder);

export default router;

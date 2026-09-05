import express from 'express';
import {
  getDashboardStats,
  getRecentOrders,
  getActiveOrders,
  getUpcomingDeliveriesForDashboard,
  getOverdueOrdersForDashboard,
  getOrderBookingSummary,
  getRevenueReport,
} from './dashboard.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'));

router.get('/', getDashboardStats);
router.get('/metrics', getDashboardStats);
router.get('/stats', getDashboardStats);
router.get('/recent-orders', getRecentOrders);
router.get('/active-orders', getActiveOrders);
router.get('/upcoming-deliveries', getUpcomingDeliveriesForDashboard);
router.get('/overdue-orders', getOverdueOrdersForDashboard);
router.get('/order-booking-summary', getOrderBookingSummary);
router.get('/revenue-report', getRevenueReport);

export default router;

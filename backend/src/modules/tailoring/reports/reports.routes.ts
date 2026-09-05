import express from 'express';
import {
  getDailySalesReport,
  getMonthlyRevenueReport,
  getCustomerReport,
  getInventoryReport,
  exportReport,
} from './reports.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);

router.get('/revenue', getMonthlyRevenueReport);
router.get('/orders', getDailySalesReport);
router.get('/daily-sales', getDailySalesReport);
router.get('/monthly-revenue', getMonthlyRevenueReport);
router.get('/customer', getCustomerReport);
router.get('/inventory', getInventoryReport);
router.get('/export', authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN'), exportReport);

export default router;
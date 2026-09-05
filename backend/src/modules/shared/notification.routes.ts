import express from 'express';
import {
  sendManualNotification,
  sendCustomSMS,
  sendCustomWhatsApp,
  getUpcomingDueOrders,
  sendBulkDueDateReminders,
} from './notification.controller';
import { authenticateToken, authorizeRoles } from './middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);

router.post('/send', sendManualNotification);
router.post('/sms', authorizeRoles('SUPER_ADMIN', 'ECOM_ADMIN'), sendCustomSMS);
router.post('/whatsapp', authorizeRoles('SUPER_ADMIN', 'ECOM_ADMIN'), sendCustomWhatsApp);
router.get('/upcoming-due', getUpcomingDueOrders);
router.post('/bulk-reminders', authorizeRoles('SUPER_ADMIN', 'ECOM_ADMIN'), sendBulkDueDateReminders);

export default router;
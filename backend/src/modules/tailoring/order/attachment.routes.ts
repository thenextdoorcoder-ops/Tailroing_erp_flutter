import express from 'express';
import {
  uploadOrderAttachments,
  getOrderAttachments,
  deleteOrderAttachment,
  uploadTempAttachments,
} from './attachment.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';
import { attachmentUpload } from '../../shared/middleware/attachmentUpload.middleware';

const router = express.Router();

const erpOnly = [authenticateToken, authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF', 'ECOM_ADMIN', 'ADMIN')];

// Temp upload (during order creation before order ID exists)
router.post(
  '/attachments/upload-temp',
  ...erpOnly,
  attachmentUpload.array('attachments', 10),
  uploadTempAttachments
);

// Order-specific attachment routes
router.post(
  '/orders/:id/attachments',
  ...erpOnly,
  attachmentUpload.array('attachments', 10),
  uploadOrderAttachments
);

router.get('/orders/:id/attachments', ...erpOnly, getOrderAttachments);

router.delete('/attachments/:attachmentId', ...erpOnly, deleteOrderAttachment);

export default router;
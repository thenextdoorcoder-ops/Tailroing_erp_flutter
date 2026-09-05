import express from 'express';
import { subscribe, unsubscribe, getVapidPublicKey } from './push.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';

const router = express.Router();

// VAPID public key is needed before subscription — still requires login
router.get('/vapid-public-key', authenticateToken, getVapidPublicKey);

// Subscription management — only ERP staff can subscribe
router.post(
  '/subscribe',
  authenticateToken,
  authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'),
  subscribe
);
router.delete(
  '/unsubscribe',
  authenticateToken,
  authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'),
  unsubscribe
);

export default router;

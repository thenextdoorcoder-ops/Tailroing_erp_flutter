import express from 'express';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';
import { submitFeedback } from './feedback.controller';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'));

router.post('/', submitFeedback);

export default router;

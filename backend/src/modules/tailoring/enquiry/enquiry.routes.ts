import express from 'express';
import { authenticateToken } from '../../shared/middleware/auth.middleware';
import {
    listEnquiries,
    createEnquiry,
    updateEnquiry,
    deleteEnquiry,
    getActiveEnquiryCount,
} from './enquiry.controller';

const router = express.Router();

// All routes are protected
router.use(authenticateToken);

router.get('/', listEnquiries);
router.get('/count', getActiveEnquiryCount);
router.post('/', createEnquiry);
router.patch('/:id', updateEnquiry);
router.delete('/:id', deleteEnquiry);

export default router;

import express from 'express';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';
import {
    registerStudent,
    getStudents,
    updateStudent,
    updatedStudentStatus,
    uploadStudentPhoto,
    addPayment,
    getStudentPayments,
    getDashboardSummary,
    downloadStudentInvoice,
    downloadCertificate
} from './student.controller';
import { upload } from '../../shared/middleware/upload.middleware';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'));

// Dashboard routes
router.get('/summary', getDashboardSummary);

// Student CRUD
router.post('/', registerStudent);
router.get('/', getStudents);
router.put('/:id', updateStudent);
router.patch('/:id/status', updatedStudentStatus);
router.post('/:id/photo', upload.single('photo'), uploadStudentPhoto);

// Payments
router.post('/:id/payments', addPayment);
router.get('/:id/payments', getStudentPayments);

// Documents
router.get('/:id/invoice', downloadStudentInvoice);
router.get('/:id/certificate', downloadCertificate);

export default router;

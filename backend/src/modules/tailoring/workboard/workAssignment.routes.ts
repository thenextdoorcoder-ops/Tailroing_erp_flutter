import express from 'express';
import {
  getWorkAssignments,
  getWorkAssignmentById,
  createWorkAssignment,
  updateWorkAssignment,
  completeWorkAssignment,
  deleteWorkAssignment,
  getProductionQueue,
  getStaffLedger,
} from './workAssignment.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'));

router.get('/', getWorkAssignments);
router.get('/production-queue', getProductionQueue);
router.get('/staff-ledger', getStaffLedger);
router.get('/:id', getWorkAssignmentById);
router.post('/', createWorkAssignment);
router.put('/:id', updateWorkAssignment);
router.patch('/:id/complete', completeWorkAssignment);
router.delete('/:id', deleteWorkAssignment);

export default router;

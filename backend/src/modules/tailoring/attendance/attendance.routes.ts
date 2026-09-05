import express from 'express';
import {
  getAttendance,
  getAttendanceById,
  markAttendance,
  updateAttendance,
  deleteAttendance,
  getTodayAttendance,
  getStaffPresentToday,
} from './attendance.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'));

router.get('/', getAttendance);
router.get('/today', getTodayAttendance);
router.get('/today/count', getStaffPresentToday);
router.get('/:id', getAttendanceById);
router.post('/', markAttendance);
router.put('/:id', updateAttendance);
router.delete('/:id', deleteAttendance);

export default router;

import express from 'express';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';
import { createCourse, getCourses, updateCourse, deleteCourse } from './course.controller';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'));

router.post('/', createCourse);
router.get('/', getCourses);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);

export default router;

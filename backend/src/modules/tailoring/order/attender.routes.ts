import { Router } from 'express';
import * as attenderController from './attender.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';

const router = Router();

router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN'));

router.get('/', attenderController.getAttenders);
router.post('/', attenderController.createAttender);
router.put('/:id', attenderController.updateAttender);
router.delete('/:id', attenderController.deleteAttender);

export default router;

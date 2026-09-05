import express from 'express';
import { tailorAdminController } from './tailor-admin.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';
import { validateBody } from '../../shared/middleware/validate.middleware';
import { createTailorAdminSchema } from '../../shared/validators/schema.validators';

const router = express.Router();

// All routes require SUPER_ADMIN
router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN'));

// List all tailor admins
router.get('/', tailorAdminController.listTailorAdmins);

// Get single tailor admin
router.get('/:id', tailorAdminController.getTailorAdmin);

// Create tailor admin
router.post(
    '/',
    validateBody(createTailorAdminSchema),
    tailorAdminController.createTailorAdmin
);

// Toggle active status
router.patch('/:id/toggle-active', tailorAdminController.toggleActive);

export default router;

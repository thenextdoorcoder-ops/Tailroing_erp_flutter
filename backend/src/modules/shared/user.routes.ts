import express from 'express';
import {
  getUsers,
  getStaffUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,

  updateInvoiceSettings,
} from './user.controller';
import { upload } from './middleware/upload.middleware';
import { authenticateToken, authorizeRoles } from './middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getUsers);
router.get('/staff', getStaffUsers);
router.patch('/invoice-settings', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'signature', maxCount: 1 },
  { name: 'brandLogo', maxCount: 1 },
  { name: 'appIcon', maxCount: 1 }
]), updateInvoiceSettings);
router.get('/:id', getUserById);
router.post('/', authorizeRoles('ADMIN'), createUser);
router.put('/:id', authorizeRoles('ADMIN'), updateUser);
router.delete('/:id', authorizeRoles('ADMIN'), deleteUser);
router.post('/:id/reset-password', authorizeRoles('ADMIN'), resetPassword);

export default router;

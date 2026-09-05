import express from 'express';
import {
  getAddOns,
  getAddOnById,
  createAddOn,
  updateAddOn,
  deleteAddOn,
} from './addOn.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'));

router.get('/', getAddOns);
router.get('/:id', getAddOnById);
router.post('/', createAddOn);
router.put('/:id', updateAddOn);
router.delete('/:id', deleteAddOn);

export default router;

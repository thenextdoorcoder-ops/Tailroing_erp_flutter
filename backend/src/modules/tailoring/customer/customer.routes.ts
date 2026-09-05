import express from 'express';
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerMeasurement,
  updateCustomerMeasurement,
  deleteCustomerMeasurement,
  uploadCustomerGallery,
  deleteCustomerGallery,
} from './customer.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';
import { upload } from '../../shared/middleware/upload.middleware';
import { validateBody } from '../../shared/middleware/validate.middleware';
import { createCustomerSchema } from '../../shared/validators/schema.validators';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'));

router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.post('/', validateBody(createCustomerSchema), createCustomer);
router.put('/:id', validateBody(createCustomerSchema.partial()), updateCustomer);
router.delete('/:id', deleteCustomer);

router.post('/:customerId/measurements', addCustomerMeasurement);
router.put('/measurements/:id', updateCustomerMeasurement);
router.delete('/measurements/:id', deleteCustomerMeasurement);

router.post('/:customerId/gallery', upload.single('image'), uploadCustomerGallery);
router.delete('/gallery/:id', deleteCustomerGallery);

export default router;

import express from 'express';
import {
  getCustomerMeasurements,
  searchMeasurements,
  getMeasurementById,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
  getLatestMeasurement,
} from './measurement.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'));

// List / Search measurements
router.get('/', searchMeasurements);
router.get('/search', searchMeasurements);

// Customer measurements
router.get('/customer/:customerId', getCustomerMeasurements);
router.get('/customer/:customerId/latest', getLatestMeasurement);

// CRUD operations
router.get('/:id', getMeasurementById);
router.post('/', createMeasurement);
router.put('/:id', updateMeasurement);
router.delete('/:id', deleteMeasurement);

export default router;
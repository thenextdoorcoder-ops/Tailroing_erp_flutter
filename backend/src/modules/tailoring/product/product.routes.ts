import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  copyProduct,
} from './product.controller';
import { getBarcodeImage, getQRCodeImage } from './barcode.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';
import { validateBody } from '../../shared/middleware/validate.middleware';
import { tailoringProductSchema } from '../../shared/validators/schema.validators';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'));

router.get('/', getProducts);
router.get('/:id', getProductById);
router.post('/', validateBody(tailoringProductSchema), createProduct);
router.put('/:id', validateBody(tailoringProductSchema.partial()), updateProduct);
router.delete('/:id', deleteProduct);
router.post('/:id/copy', copyProduct);
router.get('/barcode/image', getBarcodeImage);
router.get('/qrcode/image', getQRCodeImage);

export default router;

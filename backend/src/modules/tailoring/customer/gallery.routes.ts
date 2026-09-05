import express from 'express';
import {
  getShopGallery,
  uploadShopGallery,
  updateShopGallery,
  deleteShopGallery,
  getCustomerGallery,
  getItemGallery,
} from './gallery.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';
import { upload } from '../../shared/middleware/upload.middleware';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'));

router.get('/', getShopGallery);
router.get('/shop', getShopGallery);
router.post('/shop', upload.single('image'), uploadShopGallery);
router.put('/shop/:id', updateShopGallery);
router.delete('/shop/:id', deleteShopGallery);

router.get('/customer', getCustomerGallery);
router.get('/item', getItemGallery);

export default router;

import express from 'express';
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getItemsSummary,
  uploadItemGallery,
  deleteItemGallery,
} from './item.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';
import { upload } from '../../shared/middleware/upload.middleware';

const router = express.Router();

router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF'));

router.get('/', getItems);
router.get('/summary', getItemsSummary);
router.get('/:id', getItemById);
router.post('/', createItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);

router.post('/:itemId/gallery', upload.single('image'), uploadItemGallery);
router.delete('/gallery/:id', deleteItemGallery);

export default router;

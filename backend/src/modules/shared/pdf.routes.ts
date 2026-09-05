import express from 'express';
import { downloadInvoice, downloadBarcodeLabel } from './pdf.controller';
import { authenticateToken } from './middleware/auth.middleware';

const router = express.Router();

router.get('/invoice/:id', authenticateToken, downloadInvoice);
router.get('/barcode/:id', authenticateToken, downloadBarcodeLabel);

export default router;

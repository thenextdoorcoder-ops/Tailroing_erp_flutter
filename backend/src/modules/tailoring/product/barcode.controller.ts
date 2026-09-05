import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { generateBarcode, generateQRCode } from './barcode.service';

export const getBarcodeImage = async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.query;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const barcodeBuffer = await generateBarcode(text as string);

    res.setHeader('Content-Type', 'image/png');
    res.send(barcodeBuffer);
  } catch (error) {
    console.error('Get barcode error:', error);
    res.status(500).json({ error: 'Failed to generate barcode' });
  }
};

export const getQRCodeImage = async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.query;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const qrDataURL = await generateQRCode(text as string);

    res.json({ qrCode: qrDataURL });
  } catch (error) {
    console.error('Get QR code error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
};
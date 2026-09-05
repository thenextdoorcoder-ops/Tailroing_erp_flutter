import bwipjs from 'bwip-js';
import QRCode from 'qrcode';

// Generate Barcode
export const generateBarcode = async (text: string): Promise<Buffer> => {
  try {
    const png = await bwipjs.toBuffer({
      bcid: 'code128',
      text: text,
      scale: 3,
      height: 10,
      includetext: true,
    });
    return png;
  } catch (error) {
    console.error('Barcode generation error:', error);
    throw error;
  }
};

// Generate QR Code
export const generateQRCode = async (text: string): Promise<string> => {
  try {
    const qrDataURL = await QRCode.toDataURL(text, {
      width: 300,
      margin: 2,
    });
    return qrDataURL;
  } catch (error) {
    console.error('QR code generation error:', error);
    throw error;
  }
};
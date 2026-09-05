import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { storageService } from '../../shared/services/storage.service';

/**
 * Upload voice note for order
 * 
 * This is a standalone endpoint that can be called:
 * - During order creation
 * - After order creation to add voice note
 */
export const uploadVoiceNote = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No voice file provided' });
    }

    // Upload to storage (local or cloud)
    const result = await storageService.uploadVoiceNote(req.file);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      message: 'Voice note uploaded successfully',
      url: result.url,
    });
  } catch (error) {
    console.error('Voice upload error:', error);
    res.status(500).json({ error: 'Failed to upload voice note' });
  }
};

/**
 * Delete voice note
 */
export const deleteVoiceNote = async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Voice note URL is required' });
    }

    const deleted = await storageService.deleteVoiceNote(url);

    if (deleted) {
      res.json({ message: 'Voice note deleted successfully' });
    } else {
      res.status(404).json({ error: 'Voice note not found' });
    }
  } catch (error) {
    console.error('Voice delete error:', error);
    res.status(500).json({ error: 'Failed to delete voice note' });
  }
};
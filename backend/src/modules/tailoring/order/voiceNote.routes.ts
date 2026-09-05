import express from 'express';
import { uploadVoiceNote, deleteVoiceNote } from './voiceNote.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';
import { voiceUpload } from '../../shared/middleware/voiceUpload.middleware';

const router = express.Router();

const erpOnly = [authenticateToken, authorizeRoles('SUPER_ADMIN', 'TAILOR_ADMIN', 'STAFF')];

// Protected routes
router.post(
  '/upload',
  ...erpOnly,
  voiceUpload.single('voiceNote'),
  uploadVoiceNote
);

router.delete('/delete', ...erpOnly, deleteVoiceNote);

export default router;
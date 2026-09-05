import { Response } from 'express';
import prisma from '../../../lib/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { emailService } from '../../shared/services/email.service';

export const submitFeedback = async (req: AuthRequest, res: Response) => {
    try {
        const { feedback } = req.body;
        const authUser = req.user!;

        if (!feedback || feedback.trim().length < 10) {
            return res.status(400).json({ error: 'Feedback must be at least 10 characters long.' });
        }

        // Fetch full user details to get names
        const user = await prisma.user.findUnique({
            where: { id: authUser.id }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userName = `${user.firstName} ${user.lastName || ''}`.trim();
        const userEmail = user.email;

        await emailService.sendSupportFeedbackEmail(userEmail ?? '', userName, feedback);

        res.json({ message: 'Feedback sent successfully! Our team will get back to you.' });
    } catch (error) {
        console.error('Feedback submission error:', error);
        res.status(500).json({ error: 'Failed to send feedback. Please try again later.' });
    }
};

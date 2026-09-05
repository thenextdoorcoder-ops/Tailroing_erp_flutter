import { Response } from 'express';
import prisma from '../../../lib/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { sanitizeObject } from '../../shared/utils/sanitize.util';

// List all enquiries for the current user
export const listEnquiries = async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.query;

        const where: any = {
            userId: req.user?.ownerId as string,
        };

        if (status === 'OPEN' || status === 'CLOSED') {
            where.status = status;
        }

        const enquiries = await prisma.enquiry.findMany({
            where,
            orderBy: [
                { status: 'asc' },   // OPEN first
                { dueDate: 'asc' },  // Most urgent first
                { createdAt: 'desc' },
            ],
        });

        res.json(enquiries);
    } catch (error) {
        console.error('List enquiries error:', error);
        res.status(500).json({ error: 'Failed to fetch enquiries' });
    }
};

// Create a new enquiry
export const createEnquiry = async (req: AuthRequest, res: Response) => {
    try {
        const { name, phone, countryCode, notes, dueDate } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ error: 'Name and phone number are required' });
        }

        const enquiry = await prisma.enquiry.create({
            data: {
                userId: req.user?.ownerId as string,
                name: sanitizeObject(name.trim()),
                phone: phone.trim(),
                countryCode: countryCode || '91',
                notes: notes ? sanitizeObject(notes.trim()) : null,
                dueDate: dueDate ? new Date(dueDate) : null,
                status: 'OPEN',
            },
        });

        res.status(201).json(enquiry);
    } catch (error) {
        console.error('Create enquiry error:', error);
        res.status(500).json({ error: 'Failed to create enquiry' });
    }
};

// Update an existing enquiry
export const updateEnquiry = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phone, countryCode, notes, dueDate, status } = req.body;

        // Verify ownership
        const existing = await prisma.enquiry.findFirst({
            where: { id: id as string, userId: req.user?.ownerId as string },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Enquiry not found' });
        }

        const enquiry = await prisma.enquiry.update({
            where: { id: id as string },
            data: {
                ...(name !== undefined && { name: sanitizeObject(name.trim()) }),
                ...(phone !== undefined && { phone: phone.trim() }),
                ...(countryCode !== undefined && { countryCode }),
                ...(notes !== undefined && { notes: notes ? sanitizeObject(notes.trim()) : null }),
                ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
                ...(status !== undefined && { status }),
            },
        });

        res.json(enquiry);
    } catch (error) {
        console.error('Update enquiry error:', error);
        res.status(500).json({ error: 'Failed to update enquiry' });
    }
};

// Delete an enquiry
export const deleteEnquiry = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const existing = await prisma.enquiry.findFirst({
            where: { id: id as string, userId: req.user?.ownerId as string },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Enquiry not found' });
        }

        await prisma.enquiry.delete({ where: { id: id as string } });

        res.json({ message: 'Enquiry deleted successfully' });
    } catch (error) {
        console.error('Delete enquiry error:', error);
        res.status(500).json({ error: 'Failed to delete enquiry' });
    }
};

// Count of open enquiries (for dashboard)
export const getActiveEnquiryCount = async (req: AuthRequest, res: Response) => {
    try {
        const count = await prisma.enquiry.count({
            where: { userId: req.user?.ownerId as string, status: 'OPEN' },
        });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to count enquiries' });
    }
};

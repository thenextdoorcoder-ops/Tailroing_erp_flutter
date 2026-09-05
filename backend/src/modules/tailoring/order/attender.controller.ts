import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import prisma from '../../../lib/prisma';

export const getAttenders = async (req: AuthRequest, res: Response) => {
    try {
        const attenders = await prisma.attender.findMany({
            where: {
                userId: req.user!.ownerId as string,
            },
            orderBy: {
                name: 'asc',
            },
        });
        res.json(attenders);
    } catch (error) {
        console.error('Get attenders error:', error);
        res.status(500).json({ error: 'Failed to fetch attenders' });
    }
};

export const createAttender = async (req: AuthRequest, res: Response) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const attender = await prisma.attender.create({
            data: {
                name,
                userId: req.user!.ownerId as string,
            },
        });

        res.status(201).json(attender);
    } catch (error: any) {
        console.error('Create attender error:', error);
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'An attender with this name already exists' });
        }
        res.status(500).json({ error: 'Failed to create attender' });
    }
};

export const updateAttender = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, isActive } = req.body;

        const existing = await prisma.attender.findFirst({
            where: {
                id: id as string,
                userId: req.user!.ownerId as string,
            },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Attender not found' });
        }

        const updated = await prisma.attender.update({
            where: { id: id as string },
            data: {
                name: name !== undefined ? name : existing.name,
                isActive: isActive !== undefined ? isActive : existing.isActive,
            },
        });

        res.json(updated);
    } catch (error) {
        console.error('Update attender error:', error);
        res.status(500).json({ error: 'Failed to update attender' });
    }
};

export const deleteAttender = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const existing = await prisma.attender.findFirst({
            where: {
                id: id as string,
                userId: req.user!.ownerId as string,
            },
        });

        if (!existing) {
            return res.status(404).json({ error: 'Attender not found' });
        }

        // Check if attender is linked to any orders
        const orderCount = await prisma.tailoringOrder.count({
            where: { attenderId: id as string },
        });

        if (orderCount > 0) {
            // Soft delete by deactivating if linked to orders
            const updated = await prisma.attender.update({
                where: { id: id as string },
                data: { isActive: false },
            });
            return res.json({ message: 'Attender deactivated as they are linked to existing orders', data: updated });
        }

        await prisma.attender.delete({
            where: { id: id as string },
        });

        res.json({ message: 'Attender deleted successfully' });
    } catch (error) {
        console.error('Delete attender error:', error);
        res.status(500).json({ error: 'Failed to delete attender' });
    }
};

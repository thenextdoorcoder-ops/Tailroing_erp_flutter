import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import prisma from '../../../lib/prisma';

export const getAddOns = async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId } = req.query;

    const where: any = { userId: req.user!.ownerId, deletedAt: null };

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    const addOns = await prisma.addOn.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(addOns);
  } catch (error) {
    console.error('Get add-ons error:', error);
    res.status(500).json({ error: 'Failed to fetch add-ons' });
  }
};

export const getAddOnById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const addOn = await prisma.addOn.findFirst({
      where: {
        id,
        userId: req.user!.ownerId,
        deletedAt: null,
      },
      include: {
        category: true,
      },
    });

    if (!addOn) {
      return res.status(404).json({ error: 'Add-on not found' });
    }

    res.json(addOn);
  } catch (error) {
    console.error('Get add-on error:', error);
    res.status(500).json({ error: 'Failed to fetch add-on' });
  }
};

export const createAddOn = async (req: AuthRequest, res: Response) => {
  try {
    const { name, categoryId, price, description } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    const addOn = await prisma.addOn.create({
      data: {
        name,
        categoryId,
        price: price ? parseFloat(price) : 0,
        description,
        userId: req.user!.ownerId,
      },
      include: {
        category: true,
      },
    });

    res.status(201).json(addOn);
  } catch (error) {
    console.error('Create add-on error:', error);
    res.status(500).json({ error: 'Failed to create add-on' });
  }
};

export const updateAddOn = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, categoryId, price, description } = req.body;

    const addOn = await prisma.addOn.update({
      where: {
        id,
        userId: req.user!.ownerId
      },
      data: {
        name,
        categoryId,
        price: price ? parseFloat(price) : undefined,
        description,
      },
      include: {
        category: true,
      },
    });

    res.json(addOn);
  } catch (error) {
    console.error('Update add-on error:', error);
    res.status(500).json({ error: 'Failed to update add-on' });
  }
};

export const deleteAddOn = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const addOn = await prisma.addOn.findFirst({
      where: { id, userId: req.user!.ownerId, deletedAt: null }
    });

    if (!addOn) {
      return res.status(404).json({ error: 'Add-on not found' });
    }

    await prisma.addOn.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Add-on deleted successfully' });
  } catch (error) {
    console.error('Delete add-on error:', error);
    res.status(500).json({ error: 'Failed to delete add-on' });
  }
};

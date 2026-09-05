import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { seedService } from '../../shared/services/seed.service';
import prisma from '../../../lib/prisma';

export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: { userId: req.user!.ownerId, deletedAt: null },
      include: {
        subCategories: true,
        _count: {
          select: {
            products: true,
            subCategories: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

export const getCategoryById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const category = await prisma.category.findFirst({
      where: {
        id,
        userId: req.user!.ownerId,
        deletedAt: null
      },
      include: {
        subCategories: true,
        products: true,
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { name, measurementType, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        measurementType,
        description,
        userId: req.user!.ownerId,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, measurementType, description } = req.body;

    const category = await prisma.category.update({
      where: {
        id,
        userId: req.user!.ownerId
      },
      data: {
        name,
        measurementType,
        description,
      },
    });

    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    await prisma.category.update({
      where: {
        id,
        userId: req.user!.ownerId
      },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

export const seedDefaults = async (req: AuthRequest, res: Response) => {
  try {
    await seedService.seedDefaults(req.user!.ownerId);
    res.json({ message: 'Default categories seeded successfully' });
  } catch (error) {
    console.error('Seed defaults error:', error);
    res.status(500).json({ error: 'Failed to seed default categories' });
  }
};

import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import prisma from '../../../lib/prisma';

export const getSubCategories = async (req: AuthRequest, res: Response) => {
  try {
    const { categoryId } = req.query;

    const where: any = {
      category: { userId: req.user!.ownerId }
    };

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    const subCategories = await prisma.subCategory.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(subCategories);
  } catch (error) {
    console.error('Get subcategories error:', error);
    res.status(500).json({ error: 'Failed to fetch subcategories' });
  }
};

export const getSubCategoryById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const subCategory = await prisma.subCategory.findFirst({
      where: {
        id,
        category: { userId: req.user!.ownerId }
      },
      include: {
        category: true,
      },
    });

    if (!subCategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    res.json(subCategory);
  } catch (error) {
    console.error('Get subcategory error:', error);
    res.status(500).json({ error: 'Failed to fetch subcategory' });
  }
};

export const createSubCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { name, categoryId, description } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    // Verify category ownership
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: req.user!.ownerId }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const subCategory = await prisma.subCategory.create({
      data: {
        name,
        categoryId,
        description,
      },
      include: {
        category: true,
      },
    });

    res.status(201).json(subCategory);
  } catch (error) {
    console.error('Create subcategory error:', error);
    res.status(500).json({ error: 'Failed to create subcategory' });
  }
};

export const updateSubCategory = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, categoryId, description } = req.body;

    // Verify existing subcategory ownership
    const existingSubCategory = await prisma.subCategory.findUnique({
      where: { id },
      include: { category: true }
    });

    if (!existingSubCategory || existingSubCategory.category.userId !== req.user!.ownerId) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    // Verify new category ownership if categoryId is provided
    if (categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: categoryId, userId: req.user!.ownerId }
      });

      if (!category) {
        return res.status(404).json({ error: 'New category not found' });
      }
    }

    const subCategory = await prisma.subCategory.update({
      where: { id },
      data: {
        name,
        categoryId,
        description,
      },
      include: {
        category: true,
      },
    });

    res.json(subCategory);
  } catch (error) {
    console.error('Update subcategory error:', error);
    res.status(500).json({ error: 'Failed to update subcategory' });
  }
};

export const deleteSubCategory = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Verify ownership
    const subCategory = await prisma.subCategory.findUnique({
      where: { id },
      include: { category: true }
    });

    if (!subCategory || subCategory.category.userId !== req.user!.ownerId) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    await prisma.subCategory.delete({
      where: { id },
    });

    res.json({ message: 'Subcategory deleted successfully' });
  } catch (error) {
    console.error('Delete subcategory error:', error);
    res.status(500).json({ error: 'Failed to delete subcategory' });
  }
};

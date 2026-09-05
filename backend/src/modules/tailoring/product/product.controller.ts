import { Response } from 'express';
import prisma from '../../../lib/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { sanitizeObject } from '../../shared/utils/sanitize.util';

export const getProducts = async (req: AuthRequest, res: Response) => {
  try {
    const { search, categoryId, subCategoryId } = req.query;

    const where: any = { userId: req.user!.ownerId, deletedAt: null };

    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    if (subCategoryId) {
      where.subCategoryId = subCategoryId as string;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        subCategory: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

export const getProductById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const product = await prisma.product.findFirst({
      where: {
        id,
        userId: req.user!.ownerId,
        deletedAt: null
      },
      include: {
        category: true,
        subCategory: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

export const createProduct = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      categoryId,
      subCategoryId,
      sellingPrice,
      description,
      barcode,
    } = req.body;

    if (!name || !categoryId) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    const product = await prisma.product.create({
      data: {
        name,
        categoryId,
        subCategoryId: subCategoryId || null,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice as any) : 0,
        description: description ? sanitizeObject(description) : null,
        barcode: barcode ? sanitizeObject(barcode) : null,
        userId: req.user!.ownerId,
      },
      include: {
        category: true,
        subCategory: true,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      name,
      categoryId,
      subCategoryId,
      sellingPrice,
      description,
      barcode,
    } = req.body;

    const product = await prisma.product.update({
      where: {
        id,
        userId: req.user!.ownerId
      },
      data: {
        name,
        categoryId,
        subCategoryId: subCategoryId || null,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice as any) : undefined,
        description: description !== undefined ? sanitizeObject(description) : undefined,
        barcode: barcode !== undefined ? sanitizeObject(barcode) : undefined,
      },
      include: {
        category: true,
        subCategory: true,
      },
    });

    res.json(product);
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    await prisma.product.update({
      where: {
        id,
        userId: req.user!.ownerId
      },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

export const copyProduct = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const originalProduct = await prisma.product.findFirst({
      where: {
        id,
        userId: req.user!.ownerId,
        deletedAt: null,
      },
    });

    if (!originalProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await prisma.product.create({
      data: {
        name: `${originalProduct.name} (Copy)`,
        categoryId: originalProduct.categoryId,
        subCategoryId: originalProduct.subCategoryId,
        sellingPrice: originalProduct.sellingPrice,
        description: originalProduct.description,
        barcode: null,
        userId: req.user!.ownerId,
      },
      include: {
        category: true,
        subCategory: true,
      },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Copy product error:', error);
    res.status(500).json({ error: 'Failed to copy product' });
  }
};

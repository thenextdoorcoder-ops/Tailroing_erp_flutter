import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import prisma from '../../../lib/prisma';

export const getShopGallery = async (req: AuthRequest, res: Response) => {
  try {
    const { isDesign } = req.query;

    const where: any = {};

    if (isDesign !== undefined) {
      where.isDesign = isDesign === 'true';
    }

    const gallery = await prisma.shopGallery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(gallery);
  } catch (error) {
    console.error('Get shop gallery error:', error);
    res.status(500).json({ error: 'Failed to fetch shop gallery' });
  }
};

export const uploadShopGallery = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, isDesign } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const gallery = await prisma.shopGallery.create({
      data: {
        imagePath: req.file.path,
        title,
        description,
        isDesign: isDesign === 'true',
      },
    });

    res.status(201).json(gallery);
  } catch (error) {
    console.error('Upload shop gallery error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};

export const updateShopGallery = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { title, description, isDesign } = req.body;

    const gallery = await prisma.shopGallery.update({
      where: { id },
      data: {
        title,
        description,
        isDesign: isDesign !== undefined ? isDesign === 'true' : undefined,
      },
    });

    res.json(gallery);
  } catch (error) {
    console.error('Update shop gallery error:', error);
    res.status(500).json({ error: 'Failed to update gallery' });
  }
};

export const deleteShopGallery = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    await prisma.shopGallery.delete({
      where: { id },
    });

    res.json({ message: 'Gallery image deleted successfully' });
  } catch (error) {
    console.error('Delete shop gallery error:', error);
    res.status(500).json({ error: 'Failed to delete gallery image' });
  }
};

export const getCustomerGallery = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId, isDesign } = req.query;

    const where: any = {};

    if (customerId) {
      where.customerId = customerId as string;
    }

    if (isDesign !== undefined) {
      where.isDesign = isDesign === 'true';
    }

    const gallery = await prisma.customerGallery.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(gallery);
  } catch (error) {
    console.error('Get customer gallery error:', error);
    res.status(500).json({ error: 'Failed to fetch customer gallery' });
  }
};

export const getItemGallery = async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.query;

    const where: any = {};

    if (itemId) {
      where.itemId = itemId as string;
    }

    const gallery = await prisma.itemGallery.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            itemId: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(gallery);
  } catch (error) {
    console.error('Get item gallery error:', error);
    res.status(500).json({ error: 'Failed to fetch item gallery' });
  }
};

import { Response } from 'express';
import prisma from '../../../lib/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';

export const getUnits = async (req: AuthRequest, res: Response) => {
  try {
    const units = await prisma.unit.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json(units);
  } catch (error) {
    console.error('Get units error:', error);
    res.status(500).json({ error: 'Failed to fetch units' });
  }
};

export const getUnitById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const unit = await prisma.unit.findUnique({
      where: { id },
    });

    if (!unit) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    res.json(unit);
  } catch (error) {
    console.error('Get unit error:', error);
    res.status(500).json({ error: 'Failed to fetch unit' });
  }
};

export const createUnit = async (req: AuthRequest, res: Response) => {
  try {
    const { name, symbol } = req.body;

    if (!name || !symbol) {
      return res.status(400).json({ error: 'Name and symbol are required' });
    }

    const unit = await prisma.unit.create({
      data: {
        name,
        symbol,
      },
    });

    res.status(201).json(unit);
  } catch (error) {
    console.error('Create unit error:', error);
    res.status(500).json({ error: 'Failed to create unit' });
  }
};

export const updateUnit = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, symbol } = req.body;

    const unit = await prisma.unit.update({
      where: { id },
      data: {
        name,
        symbol,
      },
    });

    res.json(unit);
  } catch (error) {
    console.error('Update unit error:', error);
    res.status(500).json({ error: 'Failed to update unit' });
  }
};

export const deleteUnit = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    await prisma.unit.delete({
      where: { id },
    });

    res.json({ message: 'Unit deleted successfully' });
  } catch (error) {
    console.error('Delete unit error:', error);
    res.status(500).json({ error: 'Failed to delete unit' });
  }
};

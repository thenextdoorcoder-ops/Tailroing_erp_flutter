import { Response } from 'express';
import prisma from '../../../lib/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { sanitizeObject } from '../../shared/utils/sanitize.util';

export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const { category, startDate, endDate } = req.query;

    const where: any = { userId: req.user!.ownerId, deletedAt: null };

    if (category) {
      where.category = { contains: category as string, mode: 'insensitive' };
    }

    if (startDate && endDate) {
      where.expenseDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
          },
        },
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: { expenseDate: 'desc' },
    });

    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
};

export const getExpenseById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const expense = await prisma.expense.findFirst({
      where: {
        id,
        userId: req.user!.ownerId,
        deletedAt: null
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
          },
        },
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      },
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      category,
      description,
      amount,
      expenseDate,
      staffId,
    } = req.body;

    if (!name || !category || !amount) {
      return res.status(400).json({ error: 'Name, category, and amount are required' });
    }

    // Verify staff belongs to tenant if staffId is provided
    if (staffId) {
      const staffMember = await prisma.user.findFirst({
        where: {
          id: staffId,
          ownerId: req.user!.ownerId
        }
      });
      if (!staffMember) {
        return res.status(400).json({ error: 'Selected staff member does not belong to your shop' });
      }
    }

    const expense = await prisma.expense.create({
      data: {
        name: sanitizeObject(name),
        category: sanitizeObject(category),
        description: description ? sanitizeObject(description) : null,
        amount: parseFloat(amount),
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        userId: req.user!.ownerId,
        staffId: staffId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
          },
        },
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      name,
      category,
      description,
      amount,
      expenseDate,
      staffId,
    } = req.body;

    // Verify ownership
    const existingExpense = await prisma.expense.findFirst({
      where: { id, userId: req.user!.ownerId, deletedAt: null }
    });

    if (!existingExpense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: sanitizeObject(name) }),
        ...(category !== undefined && { category: sanitizeObject(category) }),
        ...(description !== undefined && { description: description ? sanitizeObject(description) : null }),
        amount: amount ? parseFloat(amount) : undefined,
        expenseDate: expenseDate ? new Date(expenseDate) : undefined,
        staffId: staffId !== undefined ? staffId : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
          },
        },
        staff: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      },
    });

    res.json(expense);
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Verify ownership
    const expense = await prisma.expense.findFirst({
      where: { id, userId: req.user!.ownerId, deletedAt: null }
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    await prisma.expense.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
};

export const getExpenseSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = { userId: req.user!.ownerId, deletedAt: null };

    if (startDate && endDate) {
      where.expenseDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const summary = await prisma.expense.aggregate({
      where,
      _sum: {
        amount: true,
      },
      _count: true,
    });

    const byCategory = await prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: {
        amount: true,
      },
    });

    res.json({
      totalExpenses: summary._count,
      totalAmount: summary._sum.amount || 0,
      byCategory,
    });
  } catch (error) {
    console.error('Get expense summary error:', error);
    res.status(500).json({ error: 'Failed to fetch expense summary' });
  }
};

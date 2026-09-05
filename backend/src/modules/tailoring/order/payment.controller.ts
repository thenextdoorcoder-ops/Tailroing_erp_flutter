import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import prisma from '../../../lib/prisma';

export const getPayments = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, customerId, paymentMethod, startDate, endDate } = req.query;

    const where: any = { userId: req.user!.ownerId };

    if (orderId) {
      where.orderId = orderId as string;
    }

    if (customerId) {
      where.customerId = customerId as string;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (startDate && endDate) {
      where.paymentDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        order: {
          select: {
            orderId: true,
            grandTotal: true,
            balanceDue: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
};

export const getPaymentById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const payment = await prisma.payment.findFirst({
      where: {
        id,
        userId: req.user!.ownerId
      },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
};

export const createPayment = async (req: AuthRequest, res: Response) => {
  try {
    const {
      orderId,
      amount,
      paymentMethod,
      paymentDate,
      notes,
    } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ error: 'Order and amount are required' });
    }

    const order = await prisma.tailoringOrder.findFirst({
      where: {
        id: orderId,
        userId: req.user!.ownerId
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const payment = await prisma.payment.create({
      data: {
        orderId,
        customerId: order.customerId,
        userId: req.user!.ownerId,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod || 'CASH',
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        notes,
      },
      include: {
        order: true,
      },
    });

    const totalPaid = await prisma.payment.aggregate({
      where: { orderId },
      _sum: { amount: true },
    });

    const balanceDue = parseFloat(order.grandTotal.toString()) -
      parseFloat(totalPaid._sum.amount?.toString() || '0');

    await prisma.tailoringOrder.update({
      where: { id: orderId },
      data: {
        advancePaid: parseFloat(totalPaid._sum.amount?.toString() || '0'),
        balanceDue,
      },
    });

    res.status(201).json(payment);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
};

export const updatePayment = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      amount,
      paymentMethod,
      paymentDate,
      notes,
    } = req.body;

    const existingPayment = await prisma.payment.findFirst({
      where: {
        id,
        userId: req.user!.ownerId
      },
    });

    if (!existingPayment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = await prisma.payment.update({
      where: { id },
      data: {
        amount: amount ? parseFloat(amount) : undefined,
        paymentMethod,
        paymentDate: paymentDate ? new Date(paymentDate) : undefined,
        notes,
      },
    });

    const totalPaid = await prisma.payment.aggregate({
      where: { orderId: existingPayment.orderId },
      _sum: { amount: true },
    });

    const order = await prisma.tailoringOrder.findUnique({
      where: { id: existingPayment.orderId },
    });

    if (order) {
      const balanceDue = parseFloat(order.grandTotal.toString()) -
        parseFloat(totalPaid._sum.amount?.toString() || '0');

      await prisma.tailoringOrder.update({
        where: { id: existingPayment.orderId },
        data: {
          advancePaid: parseFloat(totalPaid._sum.amount?.toString() || '0'),
          balanceDue,
        },
      });
    }

    res.json(payment);
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
};

export const deletePayment = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const payment = await prisma.payment.findFirst({
      where: {
        id,
        userId: req.user!.ownerId
      },
    });

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    await prisma.payment.delete({
      where: { id },
    });

    const totalPaid = await prisma.payment.aggregate({
      where: { orderId: payment.orderId },
      _sum: { amount: true },
    });

    const order = await prisma.tailoringOrder.findUnique({
      where: { id: payment.orderId },
    });

    if (order) {
      const balanceDue = parseFloat(order.grandTotal.toString()) -
        parseFloat(totalPaid._sum.amount?.toString() || '0');

      await prisma.tailoringOrder.update({
        where: { id: payment.orderId },
        data: {
          advancePaid: parseFloat(totalPaid._sum.amount?.toString() || '0'),
          balanceDue,
        },
      });
    }

    res.json({ message: 'Payment deleted successfully' });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
};

export const getPaymentSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = { userId: req.user!.ownerId };

    if (startDate && endDate) {
      where.paymentDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const summary = await prisma.payment.aggregate({
      where,
      _sum: {
        amount: true,
      },
      _count: true,
    });

    const byMethod = await prisma.payment.groupBy({
      by: ['paymentMethod'],
      where,
      _sum: {
        amount: true,
      },
    });

    res.json({
      totalPayments: summary._count,
      totalAmount: summary._sum.amount || 0,
      byMethod,
    });
  } catch (error) {
    console.error('Get payment summary error:', error);
    res.status(500).json({ error: 'Failed to fetch payment summary' });
  }
};

import { Response } from 'express';
import prisma from '../../lib/prisma';
import { AuthRequest } from './middleware/auth.middleware';
import {
  sendDueDateReminder,
  sendOrderReadyNotification,
  sendPaymentReminder,
  sendSMS,
  sendWhatsApp,
  sendEmail,
} from './services/notification.service';

// Send manual notification
export const sendManualNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId, type } = req.body;

    const order = await prisma.tailoringOrder.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    let result;
    switch (type) {
      case 'due_date_reminder':
        result = await sendDueDateReminder(order);
        break;
      case 'order_ready':
        result = await sendOrderReadyNotification(order);
        break;
      case 'payment_reminder':
        result = await sendPaymentReminder(order);
        break;
      default:
        return res.status(400).json({ error: 'Invalid notification type' });
    }

    res.json({ message: 'Notification sent successfully', result });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
};

// Send custom SMS
export const sendCustomSMS = async (req: AuthRequest, res: Response) => {
  try {
    const { mobile, message } = req.body;

    if (!mobile || !message) {
      return res.status(400).json({ error: 'Mobile and message are required' });
    }

    const result = await sendSMS(mobile, message);

    if (result.success) {
      res.json({ message: 'SMS sent successfully', result });
    } else {
      res.status(500).json({ error: 'Failed to send SMS', result });
    }
  } catch (error) {
    console.error('Send SMS error:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
};

// Send custom WhatsApp
export const sendCustomWhatsApp = async (req: AuthRequest, res: Response) => {
  try {
    const { mobile, message } = req.body;

    if (!mobile || !message) {
      return res.status(400).json({ error: 'Mobile and message are required' });
    }

    const result = await sendWhatsApp(mobile, message);

    if (result.success) {
      res.json({ message: 'WhatsApp sent successfully', result });
    } else {
      res.status(500).json({ error: 'Failed to send WhatsApp', result });
    }
  } catch (error) {
    console.error('Send WhatsApp error:', error);
    res.status(500).json({ error: 'Failed to send WhatsApp' });
  }
};

// Get upcoming due orders for reminders
export const getUpcomingDueOrders = async (req: AuthRequest, res: Response) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const orders = await prisma.tailoringOrder.findMany({
      where: {
        dueDate: {
          gte: tomorrow,
          lte: endOfTomorrow,
        },
        status: {
          not: 'DELIVERED',
        },
      },
      include: {
        customer: true,
      },
    });

    res.json(orders);
  } catch (error) {
    console.error('Get upcoming due orders error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming due orders' });
  }
};

// Send bulk reminders for tomorrow's due orders
export const sendBulkDueDateReminders = async (req: AuthRequest, res: Response) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const orders = await prisma.tailoringOrder.findMany({
      where: {
        dueDate: {
          gte: tomorrow,
          lte: endOfTomorrow,
        },
        status: {
          not: 'DELIVERED',
        },
      },
      include: {
        customer: true,
      },
    });

    const results = [];
    for (const order of orders) {
      const result = await sendDueDateReminder(order);
      results.push({
        orderId: order.orderId,
        customer: order.customer.name,
        result,
      });
    }

    res.json({
      message: `Sent reminders for ${orders.length} orders`,
      results,
    });
  } catch (error) {
    console.error('Send bulk reminders error:', error);
    res.status(500).json({ error: 'Failed to send bulk reminders' });
  }
};
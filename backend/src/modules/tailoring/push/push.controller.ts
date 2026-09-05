import { Response } from 'express';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import prisma from '../../../lib/prisma';

// POST /api/push/subscribe
export const subscribe = async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid push subscription object' });
    }

    const ownerId = req.user!.ownerId;
    const userId = req.user!.id;

    // Upsert so re-subscribing on the same device doesn't create duplicates
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId, ownerId },
      create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId, ownerId },
    });

    return res.status(201).json({ message: 'Subscribed to push notifications' });
  } catch (err: any) {
    console.error('[Push] Subscribe error:', err);
    return res.status(500).json({ error: 'Failed to save subscription' });
  }
};

// DELETE /api/push/unsubscribe
export const unsubscribe = async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ error: 'endpoint is required' });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, ownerId: req.user!.ownerId },
    });

    return res.json({ message: 'Unsubscribed from push notifications' });
  } catch (err: any) {
    console.error('[Push] Unsubscribe error:', err);
    return res.status(500).json({ error: 'Failed to remove subscription' });
  }
};

// GET /api/push/vapid-public-key  — frontend needs this to subscribe
export const getVapidPublicKey = (_req: AuthRequest, res: Response) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: 'Push notifications not configured' });
  return res.json({ publicKey: key });
};

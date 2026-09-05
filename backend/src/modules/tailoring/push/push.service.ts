import webpush from 'web-push';
import prisma from '../../../lib/prisma';

// ─────────────────────────────────────────────────────────────
// VAPID setup — called once at server startup from server.ts
// ─────────────────────────────────────────────────────────────
export function initWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL;

  if (!publicKey || !privateKey || !email) {
    console.warn('[Push] VAPID keys not set — push notifications disabled.');
    return;
  }

  webpush.setVapidDetails(email, publicKey, privateKey);
  console.log('[Push] VAPID keys configured. Push notifications enabled.');
}

// ─────────────────────────────────────────────────────────────
// Core: send to a single stored subscription
// ─────────────────────────────────────────────────────────────
async function sendOne(
  sub: { endpoint: string; p256dh: string; auth: string; id: string },
  payload: object
) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    );
  } catch (err: any) {
    // 410 Gone = subscription expired/unregistered — remove from DB
    if (err.statusCode === 410 || err.statusCode === 404) {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    } else {
      console.error('[Push] Send error:', err.message);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Send to ALL subscriptions belonging to a shop owner
// ─────────────────────────────────────────────────────────────
export async function sendToShop(
  ownerId: string,
  payload: { title: string; body: string; url?: string; badge?: number }
) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { ownerId },
  });

  if (subscriptions.length === 0) return;

  await Promise.allSettled(subscriptions.map((sub) => sendOne(sub, payload)));
}

// ─────────────────────────────────────────────────────────────
// Fix #7: Send push to customer's subscribed devices (ecom order events)
// ─────────────────────────────────────────────────────────────
export async function sendToCustomer(
  phone: string | null | undefined,
  email: string | null | undefined,
  payload: { title: string; body: string; url?: string }
) {
  if (!phone && !email) return;

  const where: any = { OR: [] };
  if (phone) where.OR.push({ phone });
  if (email) where.OR.push({ email });

  const subscriptions = await prisma.ecomPushSubscription.findMany({ where });
  if (subscriptions.length === 0) return;

  await Promise.allSettled(
    subscriptions.map((sub) =>
      sendOne({ endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth, id: sub.id }, payload)
        .catch(async (err: any) => {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await prisma.ecomPushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        })
    )
  );
}

// ─────────────────────────────────────────────────────────────
// Send overdue order alerts to all shops that have overdue orders
// ─────────────────────────────────────────────────────────────
export async function sendOverdueAlerts() {
  const now = new Date();

  // Group overdue order counts per ownerId (userId on TailoringOrder)
  const groups = await prisma.tailoringOrder.groupBy({
    by: ['userId'],
    where: {
      deletedAt: null,
      dueDate: { lt: now },
      status: { notIn: ['DELIVERED', 'CANCELLED'] },
    },
    _count: { id: true },
  });

  for (const g of groups) {
    const count = g._count.id;
    await sendToShop(g.userId, {
      title: `⚠️ ${count} Overdue Order${count > 1 ? 's' : ''}`,
      body: `You have ${count} order${count > 1 ? 's' : ''} past their due date. Tap to review.`,
      url: '/orders?overdue=true',
      badge: count,
    });
  }

  return groups.length;
}

// ─────────────────────────────────────────────────────────────
// Send upcoming delivery alerts (orders due within next 3 days)
// ─────────────────────────────────────────────────────────────
export async function sendUpcomingDeliveryAlerts() {
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const groups = await prisma.tailoringOrder.groupBy({
    by: ['userId'],
    where: {
      deletedAt: null,
      dueDate: { gte: now, lte: in3Days },
      status: { notIn: ['DELIVERED', 'CANCELLED'] },
    },
    _count: { id: true },
  });

  for (const g of groups) {
    const count = g._count.id;
    await sendToShop(g.userId, {
      title: `🚚 ${count} Delivery Due Soon`,
      body: `${count} order${count > 1 ? 's are' : ' is'} due for delivery in the next 3 days.`,
      url: '/orders?deliverySoon=true',
      badge: count,
    });
  }

  return groups.length;
}

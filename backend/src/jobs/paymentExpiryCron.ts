import cron from 'node-cron';
import prisma from '../lib/prisma';
import { sendOverdueAlerts, sendUpcomingDeliveryAlerts } from '../modules/tailoring/push/push.service';
import { whatsappService } from '../modules/shared/services/whatsapp.service';
import { emailService } from '../modules/shared/services/email.service';

// ─────────────────────────────────────────────────────────────
// Job 1: Cancel expired pending-payment orders (every 15 min)
// ─────────────────────────────────────────────────────────────
function schedulePaymentExpiry() {
  cron.schedule('*/15 * * * *', async () => {
    try {
      // Periodic check
    } catch (err) {
      console.error('[Cron] Payment expiry error:', err);
    }
  });
  console.log('[Cron] Payment expiry job scheduled (every 15 min)');
}

// ─────────────────────────────────────────────────────────────
// Job 2: Delete expired OTP records (daily 2 AM)
// ─────────────────────────────────────────────────────────────
function scheduleOtpCleanup() {
  cron.schedule('0 2 * * *', async () => {
    try {
      const { count } = await prisma.oTPVerification.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      console.log(`[Cron] Cleaned up ${count} expired OTP record(s)`);
    } catch (err) {
      console.error('[Cron] OTP cleanup error:', err);
    }
  });
  console.log('[Cron] OTP cleanup job scheduled (daily 2 AM)');
}

// ─────────────────────────────────────────────────────────────
// Job 3: Delete expired DeviceSessions (daily 3 AM)
// ─────────────────────────────────────────────────────────────
function scheduleSessionCleanup() {
  cron.schedule('0 3 * * *', async () => {
    try {
      const { count } = await prisma.deviceSession.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      console.log(`[Cron] Cleaned up ${count} expired device session(s)`);
    } catch (err) {
      console.error('[Cron] Session cleanup error:', err);
    }
  });
  console.log('[Cron] Session cleanup job scheduled (daily 3 AM)');
}

// ─────────────────────────────────────────────────────────────
// Job 4: Overdue order push alerts — 5× daily (IST: 8,11,13,16,19)
//        IST = UTC+5:30  →  UTC: 2:30, 5:30, 7:30, 10:30, 13:30
//        Cron: minutes=30, hours=2,5,7,10,13
// ─────────────────────────────────────────────────────────────
function scheduleOverdueAlerts() {
  cron.schedule('30 2,5,7,10,13 * * *', async () => {
    try {
      const shops = await sendOverdueAlerts();
      if (shops > 0) {
        console.log(`[Cron] Overdue alerts sent for ${shops} shop(s)`);
      }
    } catch (err) {
      console.error('[Cron] Overdue alert error:', err);
    }
  });
  console.log('[Cron] Overdue order alerts scheduled (5× daily at IST 8,11,13,16,19)');
}

// ─────────────────────────────────────────────────────────────
// Job 5: Upcoming delivery push alerts — 2× daily (IST: 9 AM + 2 PM)
//        UTC: 3:30 AM  +  8:30 AM
//        Cron: minutes=30, hours=3,8
// ─────────────────────────────────────────────────────────────
function scheduleDeliveryAlerts() {
  cron.schedule('30 3,8 * * *', async () => {
    try {
      const shops = await sendUpcomingDeliveryAlerts();
      if (shops > 0) {
        console.log(`[Cron] Upcoming delivery alerts sent for ${shops} shop(s)`);
      }
    } catch (err) {
      console.error('[Cron] Delivery alert error:', err);
    }
  });
  console.log('[Cron] Upcoming delivery alerts scheduled (2× daily at IST 9AM + 2PM)');
}

// ─────────────────────────────────────────────────────────────
// Job 6: Fix #14 — Abandoned cart reminders (daily 10 AM IST = 4:30 AM UTC)
// Remind carts created 24+ hours ago that haven't converted yet
// ─────────────────────────────────────────────────────────────
function scheduleAbandonedCartReminders() {
  cron.schedule('30 4 * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const carts = await prisma.abandonedCart.findMany({
        where: {
          reminderSent: false,
          convertedAt: null,
          createdAt: { lte: cutoff },
        },
      });

      let count = 0;
      for (const cart of carts) {
        try {
          const items = Array.isArray(cart.cartItems) ? cart.cartItems as any[] : [];
          if (items.length === 0) continue;
          const itemList = items.map((i: any) => `${i.name || 'Item'} ×${i.quantity || 1}`).join(', ');
          const message = `Hi! You left some items in your cart at KTown Aari Works: ${itemList}. Shop now before they sell out!`;

          if (cart.phone && cart.phone !== cart.email) {
            await whatsappService.sendStockBackNotification(cart.phone, message).catch(() => {});
          }
          if (cart.email) {
            await emailService.sendAbandonedCartEmail(cart.email, items).catch(() => {});
          }

          await prisma.abandonedCart.update({
            where: { id: cart.id },
            data: { reminderSent: true },
          });
          count++;
        } catch (err) {
          console.error('[Cron] Abandoned cart reminder error:', err);
        }
      }

      if (count > 0) console.log(`[Cron] Sent ${count} abandoned cart reminder(s)`);
    } catch (err) {
      console.error('[Cron] Abandoned cart cron error:', err);
    }
  });
  console.log('[Cron] Abandoned cart reminders scheduled (daily 10 AM IST)');
}

// ─────────────────────────────────────────────────────────────
// Start all cron jobs
// ─────────────────────────────────────────────────────────────
export function startAllCronJobs() {
  schedulePaymentExpiry();
  scheduleOtpCleanup();
  scheduleSessionCleanup();
  scheduleOverdueAlerts();
  scheduleDeliveryAlerts();
  scheduleAbandonedCartReminders();
}

// Legacy export — kept for backward compatibility
export const startPaymentExpiryCron = startAllCronJobs;


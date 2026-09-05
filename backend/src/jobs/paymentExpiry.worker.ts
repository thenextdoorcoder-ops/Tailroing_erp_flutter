import { Queue, Worker } from 'bullmq';
import prisma from '../lib/prisma';
import { config } from '../config/env';

const QUEUE_NAME = 'payment-expiry';
const REPEAT_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

export function setupPaymentExpiryQueue(): void {
    if (!config.redisUrl) return;

    try {
        const connection = { url: config.redisUrl };
        const queue = new Queue(QUEUE_NAME, { connection });

        queue.add(
            'check-expired-orders',
            {},
            {
                repeat: { every: REPEAT_INTERVAL_MS },
                removeOnComplete: 10,
                removeOnFail: 20,
            }
        );

        const worker = new Worker(
            QUEUE_NAME,
            async (job) => {
                // BullMQ periodic worker
            },
            { connection }
        );

        worker.on('failed', (job, err) => {
            console.error(`[BullMQ:paymentExpiry] Job ${job?.id} failed:`, err);
        });
    } catch (e) {
        console.warn('[BullMQ] Skipped queue initialization:', e);
    }
}

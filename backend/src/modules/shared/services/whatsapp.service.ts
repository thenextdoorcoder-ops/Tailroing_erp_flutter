import { config } from '../../../config/env';

/**
 * Send a WhatsApp message via MSG91 WhatsApp API.
 * Uses free-form text message (not a template) to the given number.
 * Works for non-OTP use-cases (order status updates, reminders).
 */
async function sendViaMSG91(to: string, message: string): Promise<void> {
    const integrationId = config.msg91.whatsappIntegrationId;
    const authKey = config.msg91.authKey;

    if (!integrationId || !authKey) {
        console.log(`[MOCK WhatsApp] To: ${to} | Msg: ${message}`);
        return;
    }

    // Normalize to E.164 (India +91 if 10 digits)
    let formattedTo = to.replace(/\D/g, '');
    if (formattedTo.length === 10) formattedTo = `91${formattedTo}`;

    const payload = {
        integrated_number: integrationId,
        content_type: 'template',
        payload: {
            to: formattedTo,
            type: 'text',
            text: { body: message },
        },
    };

    const response = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authkey': authKey,
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const err = await response.text();
        console.error(`[WhatsApp] MSG91 error: ${err}`);
    } else {
        console.log(`[WhatsApp] Sent to ${to}`);
    }
}

export const whatsappService = {
    // Fix #12: E-commerce order status WhatsApp notifications for SHIPPED / DELIVERED
    async sendEcomOrderStatusUpdate(
        to: string,
        customerName: string,
        orderNumber: string,
        status: string,
        trackingNumber?: string,
        courierName?: string
    ) {
        let message = '';
        if (status === 'SHIPPED') {
            const tracking = trackingNumber ? ` Tracking ID: *${trackingNumber}*` : '';
            const courier = courierName ? ` via *${courierName}*` : '';
            message = `Hello ${customerName}, your order *#${orderNumber}* has been shipped${courier}.${tracking} We'll notify you once delivered!`;
        } else if (status === 'DELIVERED') {
            message = `Hello ${customerName}, your order *#${orderNumber}* has been delivered! We hope you love it. Thank you for shopping with KTown Aari Works!`;
        } else {
            return; // Only handle SHIPPED and DELIVERED via WhatsApp
        }

        try {
            await sendViaMSG91(to, message);
        } catch (error) {
            console.error('[WhatsApp] Failed to send ecom order status update:', error);
        }
    },

    // Fix #13: Back-in-stock WhatsApp notification
    async sendStockBackNotification(to: string, productName: string) {
        const message = `Great news! *${productName}* is back in stock at KTown Aari Works. Shop now before it sells out again!`;
        try {
            await sendViaMSG91(to, message);
        } catch (error) {
            console.error('[WhatsApp] Failed to send stock back notification:', error);
        }
    },

    async sendOrderStatusUpdate(to: string, customerName: string, orderId: string, status: string, balanceDue: number) {
        let message = '';
        const formattedStatus = status.replace(/_/g, ' ');

        if (status === 'READY_TO_DELIVER') {
            message = `Hello ${customerName}, your order *#${orderId}* is ready for delivery! Balance Due: ₹${balanceDue}. Please collect it at your convenience.`;
        } else if (status === 'DELIVERED') {
            message = `Hello ${customerName}, your order *#${orderId}* has been delivered. Thank you for choosing KTown Aari Works!`;
        } else {
            message = `Hello ${customerName}, the status of your order #${orderId} has been updated to: ${formattedStatus}.`;
        }

        try {
            await sendViaMSG91(to, message);
        } catch (error) {
            console.error('[WhatsApp] Failed to send order status update:', error);
        }
    },
};

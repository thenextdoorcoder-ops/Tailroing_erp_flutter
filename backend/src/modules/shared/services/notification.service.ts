import nodemailer from 'nodemailer';
import { config } from '../../../config/env';

// NOTE: Twilio is only used here for WhatsApp order notifications.
// OTP SMS is handled by MSG91 (see otp.service.ts).
// SMS is disabled — use sendWhatsApp or sendEmail for notifications.

// Email Configuration
const emailTransporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

// Send SMS — Disabled (OTP uses MSG91; use sendWhatsApp for other notifications)
export const sendSMS = async (_to: string, _message: string) => {
  console.warn('[Notification] SMS via Twilio is disabled. Use MSG91 for OTP or WhatsApp for notifications.');
  return { success: false, error: 'SMS disabled' };
};

// Send WhatsApp via MSG91 WhatsApp API (order status notifications)
export const sendWhatsApp = async (to: string, message: string) => {
  const integrationId = config.msg91.whatsappIntegrationId;
  const authKey = config.msg91.authKey;

  if (!integrationId || !authKey) {
    console.log(`[MOCK WhatsApp] To: ${to} | Msg: ${message}`);
    return { success: true };
  }

  let formattedTo = to.replace(/\D/g, '');
  if (formattedTo.length === 10) formattedTo = `91${formattedTo}`;

  try {
    const response = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authkey': authKey },
      body: JSON.stringify({
        integrated_number: integrationId,
        content_type: 'template',
        payload: { to: formattedTo, type: 'text', text: { body: message } },
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    return { success: true };
  } catch (error) {
    console.error('[WhatsApp] MSG91 send error:', error);
    return { success: false, error };
  }
};


// Send Email
export const sendEmail = async (
  to: string,
  subject: string,
  html: string
) => {
  try {
    const info = await emailTransporter.sendMail({
      from: `"${config.appName}" <${config.email.user}>`,
      to,
      subject,
      html,
    });
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error };
  }
};

// Send Order Due Date Reminder
export const sendDueDateReminder = async (order: any) => {
  const message = `Hello ${order.customer.name}, your order ${order.orderId} is due on ${new Date(order.dueDate).toLocaleDateString()}. Please collect it soon. Thank you!`;

  // Send SMS
  if (order.customer.mobile) {
    await sendSMS(order.customer.mobile, message);
  }

  // Send WhatsApp
  if (order.customer.whatsapp) {
    await sendWhatsApp(order.customer.whatsapp, message);
  }
};

// Send Order Ready Notification
export const sendOrderReadyNotification = async (order: any) => {
  const message = `Hello ${order.customer.name}, your order ${order.orderId} is ready for pickup! Visit us at your convenience. Thank you!`;

  if (order.customer.mobile) {
    await sendSMS(order.customer.mobile, message);
  }

  if (order.customer.whatsapp) {
    await sendWhatsApp(order.customer.whatsapp, message);
  }
};

// Send Payment Reminder
export const sendPaymentReminder = async (order: any) => {
  const message = `Hello ${order.customer.name}, you have a pending balance of ₹${order.balanceDue} for order ${order.orderId}. Please clear the payment. Thank you!`;

  if (order.customer.mobile) {
    await sendSMS(order.customer.mobile, message);
  }

  if (order.customer.whatsapp) {
    await sendWhatsApp(order.customer.whatsapp, message);
  }
};
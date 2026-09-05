import crypto from 'crypto';
import prisma from '../../lib/prisma';
import { config } from '../../config/env';
import { OTP_CONFIG } from '../../config/otp.config';

const PHONE_REGEX = /^[+]?[0-9]{10,15}$/;

/**
 * Send OTP via MSG91 WhatsApp OTP API (primary — no DLT required).
 * Docs: https://docs.msg91.com/reference/whatsapp-send-otp
 *
 * Setup required in MSG91 dashboard:
 *   1. Enable WhatsApp channel → get your "Integrated Number" (integration ID)
 *   2. Create an OTP template named "otp_template" with variable {{1}} for the code
 *   3. Set MSG91_WHATSAPP_INTEGRATION_ID in your .env
 */
async function sendViaWhatsApp(
  phoneE164: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const { authKey, whatsappIntegrationId } = config.msg91;

  if (!authKey || !whatsappIntegrationId) {
    return { success: false, error: 'WhatsApp OTP not configured' };
  }

  // MSG91 WhatsApp expects mobile WITHOUT leading '+'
  const mobile = phoneE164.replace(/^\+/, '');

  const payload = {
    integrated_number: whatsappIntegrationId,
    content_type: 'template',
    payload: {
      messaging_product: 'whatsapp',
      type: 'template',
      template: {
        name: 'otp_template',
        language: { code: 'en' },
        components: [
          {
            type: 'body',
            parameters: [{ type: 'text', text: otp }],
          },
          // Button component for "Copy Code" / autofill (optional but recommended)
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [{ type: 'text', text: otp }],
          },
        ],
      },
      to: mobile,
    },
  };

  try {
    const response = await fetch(
      'https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: authKey,
        },
        body: JSON.stringify(payload),
      }
    );

    const data: any = await response.json();

    if (!response.ok || data.type === 'error') {
      console.error('[OTP WhatsApp MSG91] Error:', data);
      return { success: false, error: data?.message || 'MSG91 WhatsApp send failed' };
    }

    console.log(`[OTP WhatsApp MSG91] OTP sent to ${phoneE164} via WhatsApp`);
    return { success: true };
  } catch (err: any) {
    console.error('[OTP WhatsApp MSG91] Network error:', err?.message);
    return { success: false, error: 'Network error contacting MSG91 WhatsApp' };
  }
}

/**
 * Fallback: Send OTP via MSG91 SMS API (requires DLT registration).
 * Used automatically if WhatsApp integration is not configured.
 * Docs: https://docs.msg91.com/reference/send-otp
 */
async function sendViaSMS(
  phoneE164: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const { authKey, templateId, senderId } = config.msg91;

  if (!authKey || !templateId) {
    return { success: false, error: 'SMS OTP not configured' };
  }

  const mobile = phoneE164.replace(/^\+/, '');

  const payload = {
    template_id: templateId,
    mobile,
    authkey: authKey,
    otp,
    sender: senderId,
  };

  try {
    const response = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey,
      },
      body: JSON.stringify(payload),
    });

    const data: any = await response.json();

    if (!response.ok || data.type === 'error') {
      console.error('[OTP SMS MSG91] Error:', data);
      return { success: false, error: data?.message || 'MSG91 SMS send failed' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[OTP SMS MSG91] Network error:', err?.message);
    return { success: false, error: 'Network error contacting MSG91' };
  }
}

export const otpService = {
  /**
   * Normalize phone to E.164 (India +91 default)
   */
  normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (!phone.startsWith('+')) return `+${digits}`;
    return phone;
  },

  isValidPhone(phone: string): boolean {
    return PHONE_REGEX.test(phone.replace(/\s/g, ''));
  },

  generateOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
  },

  async sendOtp(
    phoneNumber: string,
    purpose: string = 'LOGIN'
  ): Promise<{ success: boolean; message?: string }> {
    const normalized = this.normalizePhone(phoneNumber);

    // Rate limit: max OTPs per phone per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.oTPVerification.count({
      where: {
        phoneNumber: normalized,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentCount >= OTP_CONFIG.rateLimitPerHour) {
      return { success: false, message: 'Too many OTP requests. Please try again after an hour.' };
    }

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + OTP_CONFIG.expiryMinutes * 60 * 1000);

    await prisma.oTPVerification.create({
      data: { phoneNumber: normalized, otp, purpose, expiresAt },
    });

    // ── Primary: WhatsApp OTP (no DLT needed) ──────────────────────────────
    const whatsAppReady = !!(config.msg91.authKey && config.msg91.whatsappIntegrationId);
    const smsReady = !!(config.msg91.authKey && config.msg91.templateId);

    if (whatsAppReady) {
      const result = await sendViaWhatsApp(normalized, otp);
      if (result.success) {
        return { success: true, message: 'OTP sent via WhatsApp.' };
      }
      console.warn('[OTP] WhatsApp send failed, attempting SMS fallback...');
    }

    // ── Fallback: SMS OTP (requires DLT) ──────────────────────────────────
    if (smsReady) {
      const result = await sendViaSMS(normalized, otp);
      if (!result.success) {
        return { success: false, message: 'Failed to send OTP. Please try again.' };
      }
      return { success: true, message: 'OTP sent via SMS.' };
    }

    // ── Dev fallback: print OTP to console ────────────────────────────────
    console.log(`\n╔══════════════════════════════════════╗`);
    console.log(`║  [OTP DEV MODE — no provider set]    ║`);
    console.log(`║  Phone  : ${normalized.padEnd(26)}║`);
    console.log(`║  OTP    : ${otp.padEnd(26)}║`);
    console.log(`║  Expires: ${expiresAt.toISOString().slice(11, 19)} UTC              ║`);
    console.log(`╚══════════════════════════════════════╝\n`);

    return { success: true, message: 'OTP sent successfully.' };
  },

  async verifyOtp(
    phoneNumber: string,
    otp: string,
    purpose: string = 'LOGIN'
  ): Promise<{ valid: boolean; message?: string; record?: { id: string } }> {
    const normalized = this.normalizePhone(phoneNumber);

    const record = await prisma.oTPVerification.findFirst({
      where: { phoneNumber: normalized, purpose, verifiedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return { valid: false, message: 'Invalid or expired OTP.' };
    }

    if (record.expiresAt < new Date()) {
      return { valid: false, message: 'OTP has expired.' };
    }

    if (record.attempts >= OTP_CONFIG.maxAttempts) {
      return { valid: false, message: 'Too many attempts. Request a new OTP.' };
    }

    await prisma.oTPVerification.update({
      where: { id: record.id },
      data: { attempts: record.attempts + 1 },
    });

    // Constant-time comparison to prevent timing attacks
    const isMatch = record.otp.length === otp.length &&
      crypto.timingSafeEqual(Buffer.from(record.otp), Buffer.from(otp));
    if (!isMatch) {
      return { valid: false, message: 'Invalid OTP.' };
    }

    await prisma.oTPVerification.update({
      where: { id: record.id },
      data: { verifiedAt: new Date() },
    });

    return { valid: true, record: { id: record.id } };
  },
};

import nodemailer from 'nodemailer';
import { config } from '../../../config/env';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

// Verify environment variables
if (!config.email.user || !config.email.pass) {
  console.error('❌ [EmailService] CRITICAL: EMAIL_USER or EMAIL_PASS is missing in environment variables!');
} else {
  console.log('✅ [EmailService] SMTP configuration detected.');
}

export const emailService = {
  // Send OTP email
  async sendOtpEmail(email: string, otp: string, shopName: string = config.appName) {
    const mailOptions = {
      from: `"${shopName}" <${config.email.user}>`,
      to: email,
      subject: `Your Verification Code: ${otp}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; text-align: center; }
            .otp-box { display: inline-block; background: #e0e7ff; color: #4338ca; font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 15px 30px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0; font-size: 24px;">${shopName}</h1>
            </div>
            <div class="content">
              <h2 style="margin-top:0;">Verify Your Email Address</h2>
              <p>Please use the verification code below to complete your checkout process.</p>
              <div class="otp-box">${otp}</div>
              <p style="font-size: 14px; color: #6b7280;">This code will expire in 15 minutes.</p>
              <p style="font-size: 14px; color: #6b7280;">If you didn't request this code, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${shopName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[EmailService] OTP email sent to: ${email}`);
    } catch (error) {
      console.error(`[EmailService] Failed to send OTP email to ${email}:`, error);
      throw error;
    }
  },

  // Send email verification
  async sendVerificationEmail(email: string, token: string, firstName: string) {
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;

    const mailOptions = {
      from: `"${config.appName}" <${config.email.user}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${config.appName}</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>Thank you for registering! Please verify your email address to complete your registration.</p>
              <p>Click the button below to verify your email:</p>
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${config.appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[EmailService] Verification email sent to: ${email}`);
    } catch (error) {
      console.error(`[EmailService] Failed to send verification email to ${email}:`, error);
      throw error;
    }
  },

  // Send password reset email
  async sendPasswordResetEmail(email: string, token: string, firstName: string) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"${config.appName}" <${config.email.user}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${config.appName}</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>We received a request to reset your password.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #dc2626;">${resetUrl}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${config.appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[EmailService] Password reset email sent to: ${email}`);
    } catch (error) {
      console.error(`[EmailService] Failed to send password reset email to ${email}:`, error);
      throw error;
    }
  },

  // Send welcome email
  async sendWelcomeEmail(email: string, firstName: string) {
    const mailOptions = {
      from: `"${config.appName}" <${config.email.user}>`,
      to: email,
      subject: 'Welcome to ' + config.appName,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 30px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${config.appName}!</h1>
            </div>
            <div class="content">
              <h2>Hi ${firstName},</h2>
              <p>Your email has been successfully verified!</p>
              <p>You can now log in and start using all features of our tailoring management system.</p>
              <p>If you have any questions, feel free to reach out to our support team.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${config.appName}. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[EmailService] Welcome email sent to: ${email}`);
    } catch (error) {
      console.error(`[EmailService] Failed to send welcome email to ${email}:`, error);
      throw error;
    }
  },

  // Send Order Status Update Email
  async sendOrderStatusEmail(email: string, customerName: string, orderId: string, status: string, balanceDue: number, shopName: string = config.appName) {
    const formattedStatus = status.replace(/_/g, ' ');
    let statusMessage = '';
    let headerColor = '#3b82f6'; // blue default

    if (status === 'READY_TO_DELIVER') {
      statusMessage = `Your order <strong>#${orderId}</strong> is ready for delivery!`;
      headerColor = '#10b981'; // green
    } else if (status === 'DELIVERED') {
      statusMessage = `Your order <strong>#${orderId}</strong> has been delivered. Thank you!`;
      headerColor = '#059669'; // darker green
    } else {
      statusMessage = `The status of your order <strong>#${orderId}</strong> has been updated to: <strong>${formattedStatus}</strong>.`;
    }

    const mailOptions = {
      from: `"${shopName}" <${config.email.user}>`,
      to: email,
      subject: `Order Update: #${orderId} - ${formattedStatus}`,
      html: `
         <!DOCTYPE html>
         <html>
         <head>
           <style>
             body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
             .container { max-width: 600px; margin: 0 auto; padding: 20px; }
             .header { background: ${headerColor}; color: white; padding: 20px; text-align: center; }
             .content { background: #f9fafb; padding: 30px; }
             .status-badge { display: inline-block; padding: 5px 10px; background: #e5e7eb; border-radius: 4px; font-weight: bold; margin-top: 10px;}
             .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
           </style>
         </head>
         <body>
           <div class="container">
             <div class="header">
               <h1>${shopName}</h1>
             </div>
             <div class="content">
               <h2>Hi ${customerName},</h2>
               <p>${statusMessage}</p>
               
               <p><strong>Balance Due:</strong> ₹${balanceDue.toFixed(2)}</p>
               
               <p>We look forward to seeing you!</p>
             </div>
             <div class="footer">
               <p>&copy; ${new Date().getFullYear()} ${shopName}. All rights reserved.</p>
             </div>
           </div>
         </body>
         </html>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Order status email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send order status email:', error);
    }
  },

  // Send Support/Feedback Email to Admin
  async sendSupportFeedbackEmail(userEmail: string, userName: string, feedback: string) {
    const mailOptions = {
      from: `"${config.appName} Support" <${config.email.user}>`,
      to: config.email.user, // Fallback to config user if SUPPORT_EMAIL is not in config yet
      replyTo: userEmail,
      subject: `New Feedback/Support Request from ${userName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
            .header { border-bottom: 2px solid #ec4899; padding-bottom: 10px; margin-bottom: 20px; }
            .footer { margin-top: 30px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px; }
            .label { font-weight: bold; color: #ec4899; width: 100px; display: inline-block; }
            .message-box { background: #fdf2f8; padding: 20px; border-radius: 8px; border-left: 4px solid #ec4899; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="color: #ec4899; margin: 0;">New Support/Feedback Request</h2>
            </div>
            <p><span class="label">User:</span> ${userName}</p>
            <p><span class="label">Email:</span> ${userEmail}</p>
            <p><span class="label">Date:</span> ${new Date().toLocaleString()}</p>
            
            <p><strong>Message:</strong></p>
            <div class="message-box">
              ${feedback.replace(/\n/g, '<br>')}
            </div>
            
            <div class="footer">
              <p>This message was sent from the ${config.appName} Feedback & Support module.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[EmailService] Support/Feedback email sent to admin regarding: ${userEmail}`);
    } catch (error) {
      console.error(`[EmailService] Failed to send support/feedback email:`, error);
      throw error;
    }
  },

  // Send E-Commerce Order Confirmation Email with Invoice PDF
  async sendEcomOrderConfirmationEmail(
    email: string,
    customerName: string,
    order: any,
    invoicePdfBuffer: Buffer,
    shopName: string = config.appName
  ) {
    const itemsTable = (order.items || []).map((item: any) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #fce7f3;">${item.product?.name || 'Product'}${item.variant?.color ? ` (${item.variant.color}${item.variant.size ? '/' + item.variant.size : ''})` : ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #fce7f3;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #fce7f3;text-align:right;">&#8377;${Number(item.unitPrice).toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #fce7f3;text-align:right;">&#8377;${Number(item.total).toFixed(2)}</td>
      </tr>`).join('');

    const mailOptions = {
      from: `"${shopName}" <${config.email.user}>`,
      to: email,
      subject: `Order Confirmed! #${order.orderNumber} - ${shopName}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          body{font-family:Arial,sans-serif;background:#fdf2f8;margin:0;padding:20px;}
          .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(190,18,60,.1);}
          .hdr{background:linear-gradient(135deg,#be123c,#e11d48);padding:28px;text-align:center;color:#fff;}
          .hdr h1{margin:0;font-size:20px;} .hdr p{margin:4px 0 0;color:#fecdd3;font-size:13px;}
          .body{padding:24px 28px;}
          .badge{display:inline-block;background:#dcfce7;color:#16a34a;padding:3px 12px;border-radius:20px;font-size:13px;font-weight:bold;margin-bottom:14px;}
          .info{background:#fdf2f8;border-radius:8px;padding:12px 16px;margin:14px 0;font-size:14px;}
          .info p{margin:3px 0;}
          table{width:100%;border-collapse:collapse;margin-top:10px;font-size:14px;}
          thead tr{background:#be123c;color:#fff;}
          thead th{padding:9px 12px;text-align:left;font-weight:600;}
          .tot td{padding:9px 12px;font-weight:bold;color:#be123c;font-size:15px;border-top:2px solid #fce7f3;}
          .ftr{text-align:center;padding:18px;background:#fdf2f8;color:#9ca3af;font-size:12px;}
        </style>
        </head><body><div class="wrap">
          <div class="hdr"><h1>Order Confirmed!</h1><p>Thank you for shopping with ${shopName}</p></div>
          <div class="body">
            <p style="font-size:16px;">Hi <strong>${customerName}</strong>,</p>
            <p>Your payment has been verified and your order is confirmed!</p>
            <span class="badge">Payment Confirmed</span>
            <div class="info">
              <p><strong>Order #:</strong> ${order.orderNumber}</p>
              <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
            <table>
              <thead><tr><th>Product</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Total</th></tr></thead>
              <tbody>
                ${itemsTable}
                <tr class="tot"><td colspan="3" style="text-align:right;padding:9px 12px;">Grand Total</td><td style="text-align:right;padding:9px 12px;">&#8377;${Number(order.grandTotal).toFixed(2)}</td></tr>
              </tbody>
            </table>
            <p style="margin-top:20px;font-size:13px;color:#6b7280;">Your invoice PDF is attached. We'll send shipping updates soon!</p>
          </div>
          <div class="ftr">&copy; ${new Date().getFullYear()} ${shopName}. All rights reserved.</div>
        </div></body></html>`,
      attachments: [{
        filename: `invoice-${order.orderNumber}.pdf`,
        content: invoicePdfBuffer,
        contentType: 'application/pdf',
      }],
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[EmailService] Order confirmation + invoice sent to: ${email} for order ${order.orderNumber}`);
    } catch (error) {
      console.error(`[EmailService] Failed to send order confirmation email:`, error);
    }
  },
  // Send E-Commerce Order Status Update Email (PROCESSING, SHIPPED, DELIVERED, CANCELLED)
  async sendEcomOrderStatusUpdateEmail(
    email: string,
    customerName: string,
    order: any,
    status: string,
    shopName: string = config.appName
  ) {
    const formattedStatus = status.replace(/_/g, ' ');
    let statusTitle = `Order Update: ${formattedStatus}`;
    let statusMessage = '';
    let headerGradient = 'linear-gradient(135deg, #3b82f6, #2563eb)'; // Default Blue

    switch (status) {
      case 'PROCESSING':
        statusTitle = 'We are processing your order!';
        statusMessage = 'Your order is currently being prepared and packed with care.';
        headerGradient = 'linear-gradient(135deg, #f59e0b, #d97706)'; // Amber
        break;
      case 'SHIPPED': {
        statusTitle = 'Your order is on the way!';
        // Fix #8: Build real tracking URL from courier name + tracking number
        const trackingLinks: Record<string, string> = {
          delhivery:  'https://www.delhivery.com/track/package/',
          dtdc:       'https://www.dtdc.in/tracking/tracking-result.asp?Trknobk=',
          bluedart:   'https://www.bluedart.com/tracking',
          ecom:       'https://ecomexpress.in/tracking/?awb_field=',
          xpressbees: 'https://www.xpressbees.com/shipment/tracking?awbNo=',
          shiprocket: 'https://tracking.shiprocket.in/track/',
          amazon:     'https://track.amazon.in/',
        };
        const courierKey = (order.courierName || '').toLowerCase().replace(/\s+/g, '');
        const matchedKey = Object.keys(trackingLinks).find(k => courierKey.includes(k));
        const trackingUrl = matchedKey && order.trackingNumber
          ? `${trackingLinks[matchedKey]}${order.trackingNumber}`
          : null;
        const trackingHtml = order.trackingNumber
          ? trackingUrl
            ? `<a href="${trackingUrl}" style="color:#4f46e5;font-weight:bold;">Track: ${order.trackingNumber}</a>`
            : `<strong>${order.trackingNumber}</strong>`
          : '<em>Available soon</em>';
        statusMessage = `Great news! Your package has been dispatched via <strong>${order.courierName || 'our courier partner'}</strong>. ${trackingHtml}`;
        headerGradient = 'linear-gradient(135deg, #6366f1, #4f46e5)'; // Indigo
        break;
      }
      case 'DELIVERED':
        statusTitle = 'Order Delivered! 💖';
        statusMessage = 'Your order has been successfully delivered. We hope you love your purchase!';
        headerGradient = 'linear-gradient(135deg, #10b981, #059669)'; // Green
        break;
      case 'CANCELLED':
        statusTitle = 'Order Cancelled';
        statusMessage = 'Your order has been cancelled. If you have any questions, please reach out to us.';
        headerGradient = 'linear-gradient(135deg, #ef4444, #dc2626)'; // Red
        break;
    }

    const mailOptions = {
      from: `"${shopName}" <${config.email.user}>`,
      to: email,
      subject: `Order Update #${order.orderNumber} - ${formattedStatus}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          body{font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;}
          .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.05);}
          .hdr{background:${headerGradient};padding:30px;text-align:center;color:#fff;}
          .hdr h1{margin:0;font-size:22px;}
          .body{padding:30px;}
          .info{background:#f3f4f6;border-radius:8px;padding:15px;margin:20px 0;font-size:14px;color:#374151;}
          .ftr{text-align:center;padding:20px;background:#f9fafb;color:#9ca3af;font-size:12px;}
        </style>
        </head><body><div class="wrap">
          <div class="hdr"><h1>${statusTitle}</h1></div>
          <div class="body">
            <p style="font-size:16px;color:#111827;">Hi <strong>${customerName}</strong>,</p>
            <p style="color:#4b5563;line-height:1.6;">${statusMessage}</p>
            <div class="info">
              <p style="margin:2px 0;"><strong>Order Number:</strong> #${order.orderNumber}</p>
              <p style="margin:2px 0;"><strong>Current Status:</strong> ${formattedStatus}</p>
              <p style="margin:2px 0;"><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <p style="margin-top:20px;color:#4b5563;font-size:14px;">You can track your order status by clicking the button below:</p>
            <a href="${config.frontendUrl}/checkout/${order.id}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 25px;text-decoration:none;border-radius:6px;font-weight:bold;margin-top:10px;">View Order Details</a>
          </div>
          <div class="ftr">&copy; ${new Date().getFullYear()} ${shopName}. All rights reserved.</div>
        </div></body></html>`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[EmailService] Order status update (${status}) sent to: ${email} for order ${order.orderNumber}`);
    } catch (error) {
      console.error(`[EmailService] Failed to send order status update email:`, error);
    }
  },

  // Fix #14: Abandoned cart recovery email
  async sendAbandonedCartEmail(email: string, items: { name?: string; quantity?: number; price?: number }[]) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.ktownaariworks.store';
    const itemRows = items.map(i =>
      `<tr><td style="padding:6px 0;color:#374151;">${i.name || 'Item'}</td><td style="padding:6px 0;text-align:right;color:#374151;">×${i.quantity || 1}</td><td style="padding:6px 0;text-align:right;color:#374151;">₹${i.price ? (Number(i.price) * (i.quantity || 1)).toLocaleString('en-IN') : '-'}</td></tr>`
    ).join('');

    const mailOptions = {
      from: `"KTown Aari Works" <${config.email.user}>`,
      to: email,
      subject: 'You left something in your cart!',
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body{font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;}
        .wrap{max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.05);}
        .hdr{background:linear-gradient(135deg,#ec4899,#be185d);padding:28px;text-align:center;color:#fff;}
        .hdr h1{margin:0;font-size:20px;}
        .body{padding:28px;color:#374151;}
        table{width:100%;border-collapse:collapse;}
        .btn{display:inline-block;background:#ec4899;color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold;margin-top:16px;}
        .ftr{text-align:center;padding:16px;background:#f9fafb;color:#9ca3af;font-size:12px;}
      </style></head><body><div class="wrap">
        <div class="hdr"><h1>Your cart is waiting!</h1></div>
        <div class="body">
          <p>Hi! You left the following items in your cart:</p>
          <table>${itemRows}</table>
          <p style="margin-top:16px;">Complete your purchase before they sell out.</p>
          <a href="${baseUrl}/cart" class="btn">Complete Order</a>
        </div>
        <div class="ftr">&copy; ${new Date().getFullYear()} KTown Aari Works</div>
      </div></body></html>`,
    };
    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('[EmailService] sendAbandonedCartEmail error:', error);
    }
  },

  // Fix #13: Back-in-stock email notification
  async sendStockBackEmail(email: string, productName: string) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.ktownaariworks.store';
    const mailOptions = {
      from: `"KTown Aari Works" <${config.email.user}>`,
      to: email,
      subject: `${productName} is back in stock!`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body{font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;}
        .wrap{max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.05);}
        .hdr{background:linear-gradient(135deg,#10b981,#059669);padding:28px;text-align:center;color:#fff;}
        .hdr h1{margin:0;font-size:20px;}
        .body{padding:28px;color:#374151;}
        .btn{display:inline-block;background:#ec4899;color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold;margin-top:16px;}
        .ftr{text-align:center;padding:16px;background:#f9fafb;color:#9ca3af;font-size:12px;}
      </style></head><body><div class="wrap">
        <div class="hdr"><h1>Back in Stock!</h1></div>
        <div class="body">
          <p>Great news! <strong>${productName}</strong> is back in stock.</p>
          <p>Hurry — it's selling fast!</p>
          <a href="${baseUrl}/shop" class="btn">Shop Now</a>
        </div>
        <div class="ftr">&copy; ${new Date().getFullYear()} KTown Aari Works</div>
      </div></body></html>`,
    };
    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('[EmailService] sendStockBackEmail error:', error);
    }
  },

  // Send New Order Notification to Admin
  async sendAdminNewOrderNotificationEmail(
    adminEmails: string[],
    order: any,
    customerName: string,
    shopName: string = config.appName
  ) {
    if (!adminEmails || adminEmails.length === 0) return;

    const mailOptions = {
      from: `"${shopName} System" <${config.email.user}>`,
      to: adminEmails,
      subject: `New Order Received! #${order.orderNumber}`,
      html: `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          body{font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;}
          .wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 15px rgba(0,0,0,.05);}
          .hdr{background:#8b5cf6;padding:25px;text-align:center;color:#fff;}
          .hdr h2{margin:0;font-size:20px;}
          .body{padding:25px;}
          .info{background:#f3f4f6;border-radius:8px;padding:15px;margin:15px 0;font-size:14px;color:#374151;}
        </style>
        </head><body><div class="wrap">
          <div class="hdr"><h2>New E-Commerce Order 🎉</h2></div>
          <div class="body">
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Order Number:</strong> #${order.orderNumber}</p>
            <p><strong>Order Total:</strong> ₹${Number(order.grandTotal).toFixed(2)}</p>
            <p><strong>Status:</strong> ${order.status.replace(/_/g, ' ')}</p>
            <div class="info">
              <p>Please log in to the admin panel to view the order details and verify payment if applicable.</p>
            </div>
            <a href="${config.frontendUrl}/admin/orders" style="display:inline-block;background:#8b5cf6;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-weight:bold;margin-top:10px;">View Orders</a>
          </div>
        </div></body></html>`,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[EmailService] Admin new order notification sent to: ${adminEmails.join(', ')}`);
    } catch (error) {
      console.error(`[EmailService] Failed to send admin new order notification email:`, error);
    }
  },
};


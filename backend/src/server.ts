import { config } from './config/env';
import express, { Application } from 'express';
import cors from 'cors';
import path from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit, Store, IncrementResponse } from 'express-rate-limit';
import { getRedis } from './lib/redis';

// Redis-backed store factory for the rate limiters
function makeRedisStore(windowMs: number, keyNs: string): Store {
  return {
    async increment(key: string): Promise<IncrementResponse> {
      const redis = getRedis();
      if (!redis) return { totalHits: 1, resetTime: new Date(Date.now() + windowMs) };
      const rKey = `${keyNs}${key}`;
      const ttl = Math.ceil(windowMs / 1000);
      const current = await redis.incr(rKey);
      if (current === 1) await redis.expire(rKey, ttl);
      const remaining = await redis.ttl(rKey);
      return { totalHits: current, resetTime: new Date(Date.now() + remaining * 1000) };
    },
    async decrement(key: string): Promise<void> {
      const redis = getRedis();
      if (redis) await redis.decr(`${keyNs}${key}`);
    },
    async resetKey(key: string): Promise<void> {
      const redis = getRedis();
      if (redis) await redis.del(`${keyNs}${key}`);
    },
  };
}

// ======================
// Route Imports - TAILORING ONLY
// ======================
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/shared/user.routes';
import customerRoutes from './modules/tailoring/customer/customer.routes';
import categoryRoutes from './modules/tailoring/category/category.routes';
import subCategoryRoutes from './modules/tailoring/category/subCategory.routes';
import productRoutes from './modules/tailoring/product/product.routes';
import addOnRoutes from './modules/tailoring/category/addOn.routes';
import unitRoutes from './modules/tailoring/inventory/unit.routes';
import itemRoutes from './modules/tailoring/inventory/item.routes';
import orderRoutes from './modules/tailoring/order/order.routes';
import paymentRoutes from './modules/tailoring/order/payment.routes';
import expenseRoutes from './modules/tailoring/expense/expense.routes';
import attendanceRoutes from './modules/tailoring/attendance/attendance.routes';
import workAssignmentRoutes from './modules/tailoring/workboard/workAssignment.routes';
import galleryRoutes from './modules/tailoring/customer/gallery.routes';
import dashboardRoutes from './modules/tailoring/dashboard/dashboard.routes';
import reviewRoutes from './modules/tailoring/customer/review.routes';
import reportsRoutes from './modules/tailoring/reports/reports.routes';
import notificationRoutes from './modules/shared/notification.routes';
import measurementRoutes from './modules/tailoring/measurement/measurement.routes';
import voiceNoteRoutes from './modules/tailoring/order/voiceNote.routes';
import attachmentRoutes from './modules/tailoring/order/attachment.routes';
import attenderRoutes from './modules/tailoring/order/attender.routes';
import pdfRoutes from './modules/shared/pdf.routes';
import adminRoutes from './modules/admin/super-admin/admin.routes';
import publicRoutes from './modules/shared/public.routes';
import courseRoutes from './modules/tailoring/course/course.routes';
import studentRoutes from './modules/tailoring/student/student.routes';
import feedbackRoutes from './modules/tailoring/customer/feedback.routes';
import tailorAdminRoutes from './modules/admin/tailor-admin/tailor-admin.routes';
import enquiryRoutes from './modules/tailoring/enquiry/enquiry.routes';
import pushRoutes from './modules/tailoring/push/push.routes';

import { errorHandler } from './modules/shared/middleware/errorHandler.middleware';
import { authenticateToken } from './modules/shared/middleware/auth.middleware';
import { initWebPush } from './modules/tailoring/push/push.service';
import { startAllCronJobs } from './jobs/paymentExpiryCron';

const app: Application = express();

// Trust proxy (Required for Render's load balancer and express-rate-limit)
app.set('trust proxy', 1);

// ======================
// CORS Configuration
// ======================
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        config.env === 'development' ||
        config.corsOrigins.includes('*') ||
        (origin && origin.startsWith('http://localhost:')) ||
        (origin && origin.startsWith('http://127.0.0.1:'))
      ) {
        return callback(null, true);
      }
      if (config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: Origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

// ======================
// Global Middleware
// ======================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ======================
// Security & Logging
// ======================
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
  store: makeRedisStore(15 * 60 * 1000, 'rl:global:'),
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeRedisStore(15 * 60 * 1000, 'rl:auth:'),
});

app.use('/api', globalLimiter);
app.use('/api/auth', authLimiter);

// ======================
// CSRF — Origin Validation
// ======================
app.use((req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  if (req.originalUrl.includes('/auth/google')) {
    return next();
  }

  const origin = req.headers.origin ?? req.headers.referer;

  if (!origin) {
    if (config.env === 'production') {
      return res.status(403).json({ error: 'CSRF: Missing Origin header' });
    }
    return next();
  }

  let requestOrigin: string;
  try {
    requestOrigin = new URL(origin).origin;
  } catch {
    return res.status(403).json({ error: 'CSRF: Malformed Origin header' });
  }

  const isAllowed =
    config.env === 'development' ||
    config.corsOrigins.includes('*') ||
    requestOrigin.startsWith('http://localhost:') ||
    requestOrigin.startsWith('http://127.0.0.1:') ||
    config.corsOrigins.includes(requestOrigin);

  if (!isAllowed) {
    return res.status(403).json({ error: 'CSRF: Origin not allowed' });
  }

  next();
});

// ─────────────────────────────────────────────────────────────
// Static Files & Upload Protection
// ─────────────────────────────────────────────────────────────
const UPLOADS_PATH = path.join(process.cwd(), 'uploads');
const PUBLIC_UPLOADS = ['product-images', 'categories'];

app.use('/uploads', (req, res, next) => {
  const subDir = req.path.split('/')[1];
  if (PUBLIC_UPLOADS.includes(subDir)) {
    return next();
  }
  return authenticateToken(req, res, next);
}, cors({ origin: true, credentials: true }), (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(UPLOADS_PATH));

// ======================
// Routes - TAILORING ERP
// ======================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sub-categories', subCategoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/add-ons', addOnRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/work-assignments', workAssignmentRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/voice-notes', voiceNoteRoutes);
app.use('/api/attenders', attenderRoutes);
app.use('/api/public', publicRoutes);
app.use('/api', attachmentRoutes);
app.use('/api/pdf', pdfRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin/tailor-admins', tailorAdminRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/push', pushRoutes);

// ======================
// Health Check
// ======================
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Tailoring ERP Server is running', env: config.env });
});

// ======================
// Error Handler (Must be Last)
// ======================
app.use(errorHandler);

// ======================
// Start Server
// ======================
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Tailoring ERP Server running in ${config.env} mode on port ${PORT}`);
  initWebPush();
  startAllCronJobs();
});

export default app;

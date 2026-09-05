import express from 'express';
import { adminController } from './admin.controller';
import { authenticateToken, authorizeRoles } from '../../shared/middleware/auth.middleware';
import { upload } from '../../shared/middleware/upload.middleware';

const router = express.Router();

// Middleware to ensure only Super Admin / Ecom Admin can access these routes
router.use(authenticateToken);
router.use(authorizeRoles('SUPER_ADMIN', 'ECOM_ADMIN'));

// User Management
router.get('/users', adminController.getUsers);
router.post('/users', adminController.createUser);
router.patch('/users/:userId/plan', adminController.updateUserPlan);

// Landing Info
router.post('/landing-slides', upload.array('slides', 5), adminController.uploadLandingSlides);

// Stats
router.get('/stats', adminController.getStats);
router.get('/stats/super', adminController.getSuperAdminStats);

// Banners (LandingBanner)
router.get('/banners', adminController.getBanners);
router.post('/banners', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mobileImage', maxCount: 1 }]), adminController.createBanner);
router.put('/banners/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'mobileImage', maxCount: 1 }]), adminController.updateBanner);
router.delete('/banners/:id', adminController.deleteBanner);

// Fraud & Audit
router.get('/fraud-flags', adminController.getFraudFlags);
router.delete('/fraud-flags/:id', adminController.deleteFraudFlag);
router.get('/audit-logs', adminController.getAuditLogs);

// Platform Config
router.get('/platform-config', adminController.getPlatformConfig);
router.put('/platform-config', adminController.updatePlatformConfig);
router.put('/branding', upload.single('logo'), adminController.updateBranding);
router.post('/branding', upload.single('logo'), adminController.updateBranding); // Keep POST as fallback/alias

// E-Commerce Orders (payment queue)
router.get('/ecom-orders', adminController.getEcomOrders);
router.get('/ecom-orders/pending', adminController.getPendingPaymentOrders);
router.post('/ecom-orders/:id/approve-payment', adminController.approvePayment);
router.post('/ecom-orders/:id/reject-payment', adminController.rejectPayment);

// About Page
router.get('/about', adminController.getAboutPage);
router.put('/about', upload.fields([
    { name: 'heroImage', maxCount: 1 },
    { name: 'storyImage', maxCount: 1 },
]), adminController.updateAboutPage);

// Blouse Gallery
router.get('/blouse-gallery', adminController.getBlouseGallery);
router.post('/blouse-gallery/groups', adminController.createBlouseGalleryGroup);
router.delete('/blouse-gallery/groups/:id', adminController.deleteBlouseGalleryGroup);
router.post('/blouse-gallery/groups/:groupId/images', upload.array('images', 20), adminController.addBlouseGalleryImages);
router.delete('/blouse-gallery/images/:imageId', adminController.deleteBlouseGalleryImage);

export default router;

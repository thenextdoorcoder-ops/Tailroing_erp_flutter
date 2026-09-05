import express from 'express';
import { publicController } from './public.controller';

const router = express.Router();

router.get('/landing-slides', publicController.getLandingSlides);
router.get('/branding', publicController.getBranding);

// E-commerce public
router.get('/banners', publicController.getEcomBanners);
router.get('/ecom/categories/tree', publicController.getEcomCategoryTree);
router.get('/ecom/featured-products', publicController.getFeaturedProducts);
router.get('/social-links', publicController.getSocialLinks);
router.get('/about', publicController.getAboutPage);
router.get('/blouse-gallery', publicController.getBlouseGallery);
router.get('/config/:key', publicController.getConfigByKey);

export default router;

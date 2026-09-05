import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import prisma from '../../lib/prisma';
import { cacheGet, cacheSet } from '../../lib/redis';

export const publicController = {
    // Get Landing Slides (legacy - from uploads folder)
    async getLandingSlides(req: Request, res: Response) {
        try {
            const cacheKey = 'public:landing-slides';
            const cached = await cacheGet(cacheKey);
            if (cached) return res.json(cached);

            const uploadDir = path.join(__dirname, '../../uploads/landing-slides');
            if (!fs.existsSync(uploadDir)) {
                return res.json({ urls: [] });
            }

            const files = fs.readdirSync(uploadDir);
            const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
            const imageFiles = files.filter(file => validExtensions.includes(path.extname(file).toLowerCase()));
            const urls = imageFiles.map(file => `/uploads/landing-slides/${file}`);

            const response = { urls };
            await cacheSet(cacheKey, response, 3600); // 1 hour cache
            res.json(response);
        } catch (error) {
            console.error('Error fetching landing slides:', error);
            res.json({ urls: [] });
        }
    },

    // Get E-commerce Banners (from LandingBanner table)
    async getEcomBanners(req: Request, res: Response) {
        try {
            const cacheKey = 'public:banners';
            const cached = await cacheGet(cacheKey);
            if (cached) return res.json(cached);

            const banners = await prisma.landingBanner.findMany({
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
            });
            await cacheSet(cacheKey, banners, 600); // 10 minutes cache
            res.json(banners);
        } catch (error) {
            console.error('Error fetching banners:', error);
            res.json([]);
        }
    },

    // Get Category Tree (public)
    async getEcomCategoryTree(req: Request, res: Response) {
        try {
            const cacheKey = 'ecom:cat:tree:public';
            const cached = await cacheGet(cacheKey);
            if (cached) return res.json(cached);

            const categories = await prisma.category.findMany({
                orderBy: { name: 'asc' },
            });
            await cacheSet(cacheKey, categories, 600); // 10 minutes cache
            res.json(categories);
        } catch (error) {
            console.error('Error fetching category tree:', error);
            res.status(500).json({ error: 'Failed to fetch categories' });
        }
    },

    // Get Featured Products (public)
    async getFeaturedProducts(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 12;
            const categoryId = req.query.categoryId as string | undefined;

            const cacheKey = `ecom:prod:featured:${categoryId || 'all'}:${page}:${limit}`;
            const cached = await cacheGet(cacheKey);
            if (cached) return res.json(cached);

            const where: any = {};
            if (categoryId) where.categoryId = categoryId;

            const [products, total] = await Promise.all([
                prisma.product.findMany({
                    where,
                    skip: (page - 1) * limit,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma.product.count({ where }),
            ]);

            const result = {
                products,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            };

            await cacheSet(cacheKey, result, 300); // 5 minutes cache
            res.json(result);
        } catch (error) {
            console.error('Error fetching featured products:', error);
            res.json({ products: [], total: 0, page: 1, limit: 12, totalPages: 0 });
        }
    },

    // Get Branding (Super Admin Shop Name & Logo)
    async getBranding(req: Request, res: Response) {
        try {
            const cacheKey = 'public:branding';
            const cached = await cacheGet(cacheKey);
            if (cached) return res.json(cached);

            const superAdmin = await prisma.user.findFirst({
                where: { role: 'SUPER_ADMIN' },
                select: {
                    id: true,
                    shopName: true,
                    logoUrl: true,
                    brandLogoUrl: true,
                    appIconUrl: true,
                    phoneNumber: true,
                }
            });

            const response = {
                shopName: superAdmin?.shopName || 'KTown Aari Works',
                logoUrl: superAdmin?.logoUrl || null,
                brandLogoUrl: superAdmin?.brandLogoUrl || null,
                appIconUrl: superAdmin?.appIconUrl || null,
                phoneNumber: superAdmin?.phoneNumber || null,
            };

            await cacheSet(cacheKey, response, 3600); // 1 hour cache
            res.json(response);
        } catch (error) {
            console.error('Error fetching branding:', error);
            res.json({ shopName: 'KTown Aari Works' });
        }
    },

    // Lookup Order Status by Order ID (public customer tracking)
    async lookupOrder(req: Request, res: Response) {
        try {
            const rawOrderId = req.params.orderId;
            const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : (rawOrderId || '');
            const order = await prisma.tailoringOrder.findFirst({
                where: { orderId: orderId.toUpperCase() },
                select: {
                    orderId: true,
                    status: true,
                    dueDate: true,
                    orderDate: true,
                    customer: {
                        select: {
                            name: true,
                        }
                    }
                }
            });

            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            res.json(order);
        } catch (error) {
            console.error('Error looking up order:', error);
            res.status(500).json({ error: 'Failed to look up order' });
        }
    },

    async getSocialLinks(req: Request, res: Response) {
        res.json({
            instagram: 'https://instagram.com',
            whatsapp: 'https://wa.me/919876543210',
            facebook: 'https://facebook.com',
        });
    },

    async getAboutPage(req: Request, res: Response) {
        res.json({
            title: 'About KTown Aari Works',
            description: 'Premier tailoring, bridal blouse stitching, and Aari embroidery boutique academy.',
        });
    },

    async getBlouseGallery(req: Request, res: Response) {
        try {
            const gallery = await prisma.shopGallery.findMany({
                orderBy: { createdAt: 'desc' },
                take: 30,
            });
            res.json(gallery);
        } catch (_) {
            res.json([]);
        }
    },

    async getConfigByKey(req: Request, res: Response) {
        res.json({ key: req.params.key, value: null });
    }
};

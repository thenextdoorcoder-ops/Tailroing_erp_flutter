import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../../../lib/prisma';
import { storageService } from '../../shared/services/storage.service';
import { authService } from '../../auth/auth.service';
import { seedService } from '../../shared/services/seed.service';

export const adminController = {
    // Get all users with pagination and search
    async getUsers(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const search = req.query.search as string;
            const skip = (page - 1) * limit;

            const where: any = {
                role: { in: [Role.TAILOR_ADMIN, Role.STAFF] }
            };

            if (search) {
                where.AND = [
                    { role: { in: [Role.TAILOR_ADMIN, Role.STAFF] } },
                    {
                        OR: [
                            { firstName: { contains: search, mode: 'insensitive' } },
                            { lastName: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } },
                            { shopName: { contains: search, mode: 'insensitive' } },
                        ]
                    }
                ];
            }

            const users = await prisma.user.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    shopName: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                    lastLoginAt: true,
                    _count: {
                        select: { orders: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
            });

            const total = await prisma.user.count({ where });

            res.json({
                users,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit),
                },
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch users' });
        }
    },

    // Plan updates removed (obsolete)
    async updateUserPlan(req: Request, res: Response) {
        return res.status(410).json({ error: 'Subscription plans are no longer supported' });
    },

    // -------------------------------------------------------------------------
    // User Management (Tailoring Admins / Merchants)
    // -------------------------------------------------------------------------
    async createUser(req: Request, res: Response) {
        try {
            const { email, firstName, lastName, password, role, shopName, phoneNumber } = req.body;

            if (!email || !password || !role || !phoneNumber) {
                return res.status(400).json({ error: 'Email, password, role, and phone number are required' });
            }

            const normalizedEmail = email.toLowerCase();
            const existing = await prisma.user.findFirst({
                where: {
                    OR: [
                        { email: normalizedEmail },
                        { phoneNumber: phoneNumber }
                    ]
                }
            });

            // If user already HAS the role, it's a true duplicate
            if (existing && existing.role === role) {
                const conflict = existing.email === normalizedEmail ? 'Email' : 'Phone number';
                return res.status(400).json({ error: `${conflict} already registered with this role` });
            }

            // Validate password policy
            const passVal = authService.validatePassword(password);
            if (!passVal.valid) {
                return res.status(400).json({ error: passVal.message });
            }

            const hashedPassword = await authService.hashPassword(password);
            let user: any;
            let isUpgrade = false;

            if (existing) {
                // PROMOTE/UPGRADE Existing User (e.g. from CUSTOMER)
                isUpgrade = true;
                user = await prisma.user.update({
                    where: { id: existing.id },
                    data: {
                        role: role as Role,
                        password: hashedPassword, // Set/Override password
                        firstName: firstName || existing.firstName,
                        lastName: lastName || existing.lastName,
                        shopName: shopName || existing.shopName,
                        isActive: true,
                        isEmailVerified: true
                    }
                });
            } else {
                // CREATE Brand New User
                user = await prisma.user.create({
                    data: {
                        email: normalizedEmail,
                        phoneNumber: phoneNumber,
                        firstName: firstName || '',
                        lastName: lastName || '',
                        password: hashedPassword,
                        role: role as Role,
                        shopName: shopName || 'Standalone Merchant',
                        isEmailVerified: true,
                        isActive: true
                    }
                });
            }

            // Seed defaults if it's a tailor admin (for both new and upgraded)
            if (user.role === Role.TAILOR_ADMIN) {
                await seedService.seedDefaults(user.id).catch(err => {
                    console.error('Failed to seed defaults for merchant:', err);
                });
            }

            res.status(existing ? 200 : 201).json({
                message: isUpgrade ? 'User account upgraded successfully' : 'User created successfully',
                isUpgrade,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    firstName: user.firstName
                }
            });
        } catch (error: any) {
            console.error('[AdminController] createUser - Error:', error);
            res.status(500).json({ error: 'Failed to process user account', details: error.message });
        }
    },

    // Get System Stats
    async getStats(req: Request, res: Response) {
        try {
            const totalUsers = await prisma.user.count();
            const totalOrders = await prisma.tailoringOrder.count();

            res.json({
                totalUsers,
                totalOrders,
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch stats' });
        }
    },

    // Upload Landing Slides
    async uploadLandingSlides(req: Request, res: Response) {
        try {
            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) {
                return res.status(400).json({ error: 'No files provided' });
            }

            const uploadResults = await Promise.all(
                files.map(file => storageService.uploadMulterFile(file, 'landing-slides'))
            );

            const failed = uploadResults.filter(r => !r.success);
            if (failed.length > 0) {
                return res.status(500).json({ error: 'Some slides failed to upload' });
            }

            const urls = uploadResults.map(r => r.url!);
            res.json({ message: 'Slides uploaded successfully', urls });
        } catch (error) {
            console.error('Error uploading slides:', error);
            res.status(500).json({ error: 'Failed to upload slides' });
        }
    },

    // -------------------------------------------------------------------------
    // Super Admin - E-Commerce Banners (LandingBanner)
    // -------------------------------------------------------------------------
    async getBanners(_req: Request, res: Response) {
        try {
            const banners = await prisma.landingBanner.findMany({ orderBy: { sortOrder: 'asc' } });
            res.json(banners);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch banners' });
        }
    },

    async createBanner(req: Request, res: Response) {
        try {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };

            let imageUrl = req.body.imageUrl;
            let mobileImageUrl = req.body.mobileImageUrl;

            if (files?.['image']?.[0]) {
                const r = await storageService.uploadMulterFile(files['image'][0], 'banners');
                if (!r.success) return res.status(500).json({ error: 'Failed to upload banner image' });
                imageUrl = r.url;
            }
            if (files?.['mobileImage']?.[0]) {
                const r = await storageService.uploadMulterFile(files['mobileImage'][0], 'banners');
                if (r.success) mobileImageUrl = r.url;
            }

            // Fallback strategy to bypass DB constraints when only mobile is uploaded
            if (!imageUrl && mobileImageUrl) {
                imageUrl = mobileImageUrl;
            }

            if (!imageUrl) {
                return res.status(400).json({ error: 'At least one image file (Desktop or Mobile) is required' });
            }

            const { title, linkUrl, sortOrder, isActive } = req.body;
            const parsedSortOrder = sortOrder ? parseInt(String(sortOrder)) : 0;
            const parsedIsActive = isActive !== undefined ? String(isActive) === 'true' : true;

            const banner = await prisma.landingBanner.create({
                data: { imageUrl, mobileImageUrl, title, linkUrl, sortOrder: parsedSortOrder, isActive: parsedIsActive },
            });
            res.status(201).json(banner);
        } catch (error: any) {
            console.error('[AdminController] createBanner - Error:', error);
            res.status(500).json({ error: 'Failed to create banner', details: error.message });
        }
    },

    async updateBanner(req: Request, res: Response) {
        try {
            const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0] ?? '';
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };

            const { title, linkUrl, sortOrder, isActive } = req.body;
            let imageUrl = req.body.imageUrl;
            let mobileImageUrl = req.body.mobileImageUrl;

            if (files?.['image']?.[0]) {
                const r = await storageService.uploadMulterFile(files['image'][0], 'banners');
                if (r.success) imageUrl = r.url;
            }
            if (files?.['mobileImage']?.[0]) {
                const r = await storageService.uploadMulterFile(files['mobileImage'][0], 'banners');
                if (r.success) mobileImageUrl = r.url;
            }

            if (!imageUrl && mobileImageUrl) {
                imageUrl = mobileImageUrl;
            }

            const updateData: any = { title, linkUrl };
            if (imageUrl) updateData.imageUrl = imageUrl;
            if (mobileImageUrl) updateData.mobileImageUrl = mobileImageUrl;
            if (sortOrder !== undefined) updateData.sortOrder = parseInt(String(sortOrder));
            if (isActive !== undefined) updateData.isActive = String(isActive) === 'true';

            const banner = await prisma.landingBanner.update({
                where: { id },
                data: updateData,
            });
            res.json(banner);
        } catch (error: any) {
            console.error('[AdminController] updateBanner - Error:', error);
            res.status(500).json({ error: 'Failed to update banner' });
        }
    },

    async deleteBanner(req: Request, res: Response) {
        try {
            const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0] ?? '';

            const banner = await prisma.landingBanner.findUnique({ where: { id } });
            if (banner) {
                if (banner.imageUrl) await storageService.deleteFile(banner.imageUrl).catch(() => { });
                if (banner.mobileImageUrl) await storageService.deleteFile(banner.mobileImageUrl).catch(() => { });
            }

            await prisma.landingBanner.delete({ where: { id } });
            res.json({ message: 'Banner deleted' });
        } catch (error: any) {
            console.error('[AdminController] deleteBanner - Error:', error);
            res.status(500).json({ error: 'Failed to delete banner' });
        }
    },

    // -------------------------------------------------------------------------
    // Fraud Flags
    // -------------------------------------------------------------------------
    async getFraudFlags(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
            const skip = (page - 1) * limit;
            const flags = await prisma.fraudFlag.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } });
            const total = await prisma.fraudFlag.count();
            res.json({ flags, total, page, pages: Math.ceil(total / limit) });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch fraud flags' });
        }
    },

    async deleteFraudFlag(req: Request, res: Response) {
        try {
            const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0] ?? '';
            await prisma.fraudFlag.delete({ where: { id } });
            res.json({ message: 'Fraud flag dismissed' });
        } catch (error: any) {
            if (error?.code === 'P2025') {
                return res.status(404).json({ error: 'Flag not found' });
            }
            res.status(500).json({ error: 'Failed to dismiss fraud flag' });
        }
    },

    // -------------------------------------------------------------------------
    // Audit Logs
    // -------------------------------------------------------------------------
    async getAuditLogs(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
            const skip = (page - 1) * limit;
            const entity = req.query.entity as string;
            const entityId = req.query.entityId as string;

            const where: any = {};
            if (entity) where.entity = entity;
            if (entityId) where.entityId = entityId;

            const logs = await prisma.auditLog.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } });
            const total = await prisma.auditLog.count({ where });
            res.json({ logs, total, page, pages: Math.ceil(total / limit) });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch audit logs' });
        }
    },

    // -------------------------------------------------------------------------
    // Platform Config (UPI, etc.)
    // -------------------------------------------------------------------------
    async getPlatformConfig(req: Request, res: Response) {
        try {
            const key = (req.query.key as string) || 'UPI_PAYMENT';
            const config = await prisma.platformConfig.findUnique({ where: { key } });
            res.json(config?.value ?? {});
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch config' });
        }
    },

    async updatePlatformConfig(req: Request, res: Response) {
        try {
            const { key, value } = req.body;
            if (!key) return res.status(400).json({ error: 'key is required' });
            const config = await prisma.platformConfig.upsert({
                where: { key: key as string },
                create: { key, value: value ?? {} },
                update: { value: value ?? {} },
            });
            res.json(config);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update config' });
        }
    },

    // -------------------------------------------------------------------------
    // Super Admin Dashboard Stats (Hybrid)
    // -------------------------------------------------------------------------
    async getSuperAdminStats(_req: Request, res: Response) {
        try {
            const totalTailoringUsers = await prisma.user.count({ where: { role: { in: [Role.TAILOR_ADMIN, Role.STAFF] } } });
            const totalTailoringOrders = await prisma.tailoringOrder.count();
            const totalEcomOrders = await prisma.ecomOrder.count();
            const pendingPaymentOrders = await prisma.ecomOrder.count({
                where: {
                    status: 'PENDING_PAYMENT_VERIFICATION',
                    OR: [
                        { paymentExpiresAt: { gt: new Date() } },
                        { paymentProofs: { some: {} } }
                    ]
                }
            });
            const fraudFlagsCount = await prisma.fraudFlag.count();

            res.json({
                tailoring: { users: totalTailoringUsers, orders: totalTailoringOrders },
                ecommerce: { orders: totalEcomOrders, pendingPayment: pendingPaymentOrders },
                fraudFlags: fraudFlagsCount,
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch stats' });
        }
    },

    // -------------------------------------------------------------------------
    // E-Commerce Orders
    // -------------------------------------------------------------------------
    async getEcomOrders(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
            const status = req.query.status as string | undefined;
            const search = req.query.search as string | undefined;
            const startDate = req.query.startDate as string | undefined;
            const endDate = req.query.endDate as string | undefined;
            const skip = (page - 1) * limit;
            const where: any = {};
            if (status) where.status = status;

            if (search) {
                where.OR = [
                    { orderNumber: { contains: search, mode: 'insensitive' } },
                    { guestPhone: { contains: search, mode: 'insensitive' } },
                    { guestEmail: { contains: search, mode: 'insensitive' } },
                ];
            }

            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) where.createdAt.gte = new Date(startDate);
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    where.createdAt.lte = end;
                }
            }

            const orders = await prisma.ecomOrder.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    paymentProofs: { orderBy: { createdAt: 'desc' } },
                    items: { include: { product: { select: { name: true, id: true } }, variant: true } },
                },
            });
            const total = await prisma.ecomOrder.count({ where });
            res.json({ orders, total, page, pages: Math.ceil(total / limit) });
        } catch (error) {
            console.error('[getEcomOrders] Error:', error);
            res.status(500).json({ error: 'Failed to fetch ecom orders' });
        }
    },

    async getPendingPaymentOrders(_req: Request, res: Response) {
        try {
            const orders = await prisma.ecomOrder.findMany({
                where: {
                    status: 'PENDING_PAYMENT_VERIFICATION',
                    OR: [
                        { paymentExpiresAt: { gt: new Date() } },
                        { paymentProofs: { some: { verificationStatus: 'PENDING' } } },
                    ],
                },
                orderBy: { createdAt: 'asc' },
                include: {
                    paymentProofs: { where: { verificationStatus: 'PENDING' }, orderBy: { createdAt: 'desc' }, take: 1 },
                    items: { include: { product: { select: { name: true } }, variant: { select: { color: true, size: true } } } },
                },
            });
            res.json(orders);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch pending orders' });
        }
    },

    async approvePayment(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const proof = await prisma.paymentProof.updateMany({
                where: { orderId: String(id) },
                data: { verificationStatus: 'APPROVED' },
            });
            res.json({ message: 'Payment approved', proof });
        } catch (error: any) {
            console.error('[approvePayment] Error:', error);
            res.status(500).json({ error: error.message || 'Failed to approve payment' });
        }
    },

    async rejectPayment(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const reason = req.body?.reason || req.body?.note || 'Rejected by admin';
            const proof = await prisma.paymentProof.updateMany({
                where: { orderId: String(id) },
                data: { verificationStatus: 'REJECTED', rejectionReason: reason },
            });
            res.json({ message: 'Payment rejected', proof });
        } catch (error: any) {
            console.error('[rejectPayment] Error:', error);
            res.status(500).json({ error: error.message || 'Failed to reject payment' });
        }
    },

    // -------------------------------------------------------------------------
    // Branding & Identity
    // -------------------------------------------------------------------------
    async updateBranding(req: Request, res: Response) {
        try {
            const { shopName } = req.body;
            const file = req.file;

            const superAdmin = await prisma.user.findFirst({
                where: { role: 'SUPER_ADMIN' as any }
            });

            if (!superAdmin) {
                return res.status(404).json({ error: 'Super Admin not found' });
            }

            const updateData: any = {};
            if (shopName) updateData.shopName = shopName;
            if (file) {
                const result = await storageService.uploadMulterFile(file, 'shop');
                if (!result.success) {
                    return res.status(500).json({ error: 'Failed to upload logo' });
                }
                updateData.brandLogoUrl = result.url;
                updateData.logoUrl = result.url;
            }

            const updated = await prisma.user.update({
                where: { id: superAdmin.id },
                data: updateData,
                select: { shopName: true, brandLogoUrl: true }
            });

            res.json({
                message: 'Branding updated successfully',
                branding: { shopName: updated.shopName, logoUrl: updated.brandLogoUrl }
            });
        } catch (error: any) {
            console.error('[updateBranding] Error:', error);
            res.status(500).json({ error: 'Failed to update branding' });
        }
    },

    // -------------------------------------------------------------------------
    // About Page Management
    // -------------------------------------------------------------------------
    async getAboutPage(_req: Request, res: Response) {
        try {
            const config = await prisma.platformConfig.findUnique({
                where: { key: 'ABOUT_PAGE' }
            });
            res.json(config?.value || {});
        } catch (error) {
            console.error('[getAboutPage] Error:', error);
            res.status(500).json({ error: 'Failed to fetch about page' });
        }
    },

    async updateAboutPage(req: Request, res: Response) {
        try {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            const body = req.body;

            const existing = await prisma.platformConfig.findUnique({ where: { key: 'ABOUT_PAGE' } });
            const currentValue: any = existing?.value || {};

            const newValue: any = {
                ...currentValue,
                tagline: body.tagline ?? currentValue.tagline ?? '',
                bio: body.bio ?? currentValue.bio ?? '',
                storyText: body.storyText ?? currentValue.storyText ?? '',
                mapEmbed: body.mapEmbed ?? currentValue.mapEmbed ?? '',
                socialLinks: body.socialLinks ? JSON.parse(body.socialLinks) : (currentValue.socialLinks ?? {}),
                achievements: body.achievements ? JSON.parse(body.achievements) : (currentValue.achievements ?? []),
            };

            if (files?.heroImage?.[0]) {
                const r = await storageService.uploadMulterFile(files.heroImage[0], 'about');
                if (r.success) newValue.heroImage = r.url;
            }
            if (files?.storyImage?.[0]) {
                const r = await storageService.uploadMulterFile(files.storyImage[0], 'about');
                if (r.success) newValue.storyImage = r.url;
            }

            const updated = await prisma.platformConfig.upsert({
                where: { key: 'ABOUT_PAGE' },
                create: { key: 'ABOUT_PAGE', value: newValue },
                update: { value: newValue },
            });

            res.json({ message: 'About page updated successfully', data: updated.value });
        } catch (error: any) {
            console.error('[updateAboutPage] Error:', error);
            res.status(500).json({ error: 'Failed to update about page' });
        }
    },

    // -------------------------------------------------------------------------
    // Blouse Gallery Management
    // -------------------------------------------------------------------------

    // Get all price groups with their images
    async getBlouseGallery(_req: Request, res: Response) {
        try {
            const groups = await (prisma as any).blouseGalleryGroup.findMany({
                orderBy: { sortOrder: 'asc' },
                include: {
                    images: { orderBy: { sortOrder: 'asc' } }
                }
            });
            res.json(groups);
        } catch (error) {
            console.error('[getBlouseGallery] Error:', error);
            res.status(500).json({ error: 'Failed to fetch blouse gallery' });
        }
    },

    // Create a new price group
    async createBlouseGalleryGroup(req: Request, res: Response) {
        try {
            const { price, label, sortOrder } = req.body;
            if (!price) return res.status(400).json({ error: 'Price is required' });
            const group = await (prisma as any).blouseGalleryGroup.create({
                data: {
                    price: parseInt(price),
                    label: label || null,
                    sortOrder: sortOrder ? parseInt(sortOrder) : 0,
                }
            });
            res.status(201).json(group);
        } catch (error) {
            console.error('[createBlouseGalleryGroup] Error:', error);
            res.status(500).json({ error: 'Failed to create price group' });
        }
    },

    // Delete a price group (also deletes its images via cascade)
    async deleteBlouseGalleryGroup(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await (prisma as any).blouseGalleryGroup.delete({ where: { id } });
            res.json({ message: 'Price group deleted' });
        } catch (error) {
            console.error('[deleteBlouseGalleryGroup] Error:', error);
            res.status(500).json({ error: 'Failed to delete price group' });
        }
    },

    // Upload images to a price group
    async addBlouseGalleryImages(req: Request, res: Response) {
        try {
            const { groupId } = req.params;
            const files = req.files as Express.Multer.File[];
            if (!files || files.length === 0) {
                return res.status(400).json({ error: 'No files provided' });
            }

            const group = await (prisma as any).blouseGalleryGroup.findUnique({ where: { id: groupId } });
            if (!group) return res.status(404).json({ error: 'Price group not found' });

            const existing = await (prisma as any).blouseGalleryImage.findMany({
                where: { groupId },
                orderBy: { sortOrder: 'desc' },
                take: 1,
            });
            let nextOrder = existing.length > 0 ? existing[0].sortOrder + 1 : 0;

            const created = await Promise.all(files.map(async (file, i) => {
                const result = await storageService.uploadMulterFile(file, 'blouse-gallery');
                if (!result.success) throw new Error(`Failed to upload image: ${file.originalname}`);
                return (prisma as any).blouseGalleryImage.create({
                    data: { groupId, imageUrl: result.url!, sortOrder: nextOrder + i }
                });
            }));

            res.status(201).json(created);
        } catch (error) {
            console.error('[addBlouseGalleryImages] Error:', error);
            res.status(500).json({ error: 'Failed to upload images' });
        }
    },

    // Delete a single image from gallery
    async deleteBlouseGalleryImage(req: Request, res: Response) {
        try {
            const { imageId } = req.params;
            const img = await (prisma as any).blouseGalleryImage.findUnique({ where: { id: imageId } });
            if (!img) return res.status(404).json({ error: 'Image not found' });

            // Delete from Supabase Storage
            await storageService.deleteFile(img.imageUrl);

            await (prisma as any).blouseGalleryImage.delete({ where: { id: imageId } });
            res.json({ message: 'Image deleted' });
        } catch (error) {
            console.error('[deleteBlouseGalleryImage] Error:', error);
            res.status(500).json({ error: 'Failed to delete image' });
        }
    },
};

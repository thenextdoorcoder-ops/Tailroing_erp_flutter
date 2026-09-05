import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import prisma from '../../../lib/prisma';
import { auditLogService } from '../../shared/services/auditLog.service';
import bcrypt from 'bcrypt';
import { sanitizeObject } from '../../shared/utils/sanitize.util';

/**
 * Tailor-Admin Controller
 * Super Admin manages TAILOR_ADMIN users (create, list, toggle active).
 * STAFF users are created by the TAILOR_ADMIN themselves (existing flow).
 */
export const tailorAdminController = {
    // -------------------------------------------------------------------------
    // List all TAILOR_ADMIN users
    // -------------------------------------------------------------------------
    async listTailorAdmins(req: Request, res: Response) {
        try {
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
            const skip = (page - 1) * limit;
            const search = req.query.search as string | undefined;

            const where: any = {
                role: Role.TAILOR_ADMIN,
                ownerId: null, // Only owners, not staff
            };

            if (search) {
                where.OR = [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { phoneNumber: { contains: search, mode: 'insensitive' } },
                    { shopName: { contains: search, mode: 'insensitive' } },
                ];
            }

            const admins = await prisma.user.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phoneNumber: true,
                    shopName: true,
                    role: true,
                    isActive: true,
                    isEmailVerified: true,
                    createdAt: true,
                    lastLoginAt: true,
                    _count: { select: { orders: true, customers: true, staff: true } },
                },
                orderBy: { createdAt: 'desc' },
            });

            const total = await prisma.user.count({ where });

            res.json({ admins, total, page, pages: Math.ceil(total / limit) });
        } catch (error) {
            console.error('[TailorAdmin] listTailorAdmins error:', error);
            res.status(500).json({ error: 'Failed to fetch tailor admins' });
        }
    },

    // -------------------------------------------------------------------------
    // Create a new TAILOR_ADMIN user
    // -------------------------------------------------------------------------
    async createTailorAdmin(req: Request, res: Response) {
        try {
            const { firstName, lastName, email, phoneNumber, shopName, password } = req.body;

            if (!firstName || !lastName || !phoneNumber || !shopName) {
                return res.status(400).json({ error: 'firstName, lastName, phoneNumber, and shopName are required' });
            }

            // Check uniqueness
            if (phoneNumber) {
                const existing = await prisma.user.findUnique({ where: { phoneNumber } });
                if (existing) return res.status(400).json({ error: 'Phone number already registered' });
            }
            if (email) {
                const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
                if (existing) return res.status(400).json({ error: 'Email already registered' });
            }

            const hashedPassword = password ? await bcrypt.hash(password, 10) : undefined;

            const user = await prisma.user.create({
                data: {
                    firstName: sanitizeObject(firstName),
                    lastName: sanitizeObject(lastName),
                    email: email ? email.toLowerCase() : null,
                    phoneNumber,
                    shopName: sanitizeObject(shopName),
                    role: Role.TAILOR_ADMIN,
                    isEmailVerified: !!email,
                    isActive: true,
                    password: hashedPassword,
                },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phoneNumber: true,
                    shopName: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                },
            });

            const authReq = req as any;
            await auditLogService.log({
                userId: authReq.user?.id,
                action: 'TAILOR_ADMIN_CREATED',
                entity: 'User',
                entityId: user.id,
                changes: { shopName, phoneNumber },
            });

            res.status(201).json(user);
        } catch (error: any) {
            console.error('[TailorAdmin] createTailorAdmin error:', error);
            res.status(400).json({ error: error.message || 'Failed to create tailor admin' });
        }
    },

    // -------------------------------------------------------------------------
    // Toggle isActive for a TAILOR_ADMIN
    // -------------------------------------------------------------------------
    async toggleActive(req: Request, res: Response) {
        try {
            const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0] ?? '';
            const user = await prisma.user.findFirst({
                where: { id, role: Role.TAILOR_ADMIN },
            });
            if (!user) return res.status(404).json({ error: 'Tailor admin not found' });

            const updated = await prisma.user.update({
                where: { id },
                data: { isActive: !user.isActive },
                select: { id: true, isActive: true, firstName: true, lastName: true },
            });

            const authReq = req as any;
            await auditLogService.log({
                userId: authReq.user?.id,
                action: updated.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
                entity: 'User',
                entityId: id,
            });

            res.json(updated);
        } catch (error) {
            res.status(500).json({ error: 'Failed to toggle user status' });
        }
    },

    // -------------------------------------------------------------------------
    // Get a single TAILOR_ADMIN with their stats
    // -------------------------------------------------------------------------
    async getTailorAdmin(req: Request, res: Response) {
        try {
            const id = typeof req.params.id === 'string' ? req.params.id : req.params.id?.[0] ?? '';
            const user = await prisma.user.findFirst({
                where: { id, role: Role.TAILOR_ADMIN },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phoneNumber: true,
                    shopName: true,
                    logoUrl: true,
                    isActive: true,
                    isEmailVerified: true,
                    createdAt: true,
                    lastLoginAt: true,
                    _count: {
                        select: { orders: true, customers: true, staff: true, products: true },
                    },
                },
            });
            if (!user) return res.status(404).json({ error: 'Tailor admin not found' });
            res.json(user);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch tailor admin' });
        }
    },
};

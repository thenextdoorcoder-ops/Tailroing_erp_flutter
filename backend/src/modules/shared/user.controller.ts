import { Response } from 'express';
import bcrypt from 'bcrypt';
import { Role } from '@prisma/client';
import { AuthRequest } from './middleware/auth.middleware';
import prisma from '../../lib/prisma';
import { SUBSCRIPTION_LIMITS } from '../../config/subscription.config';

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = req.user!;

    const users = await prisma.user.findMany({
      where: currentUser.role === 'SUPER_ADMIN' ? {} : {
        OR: [
          { id: currentUser.id },
          { ownerId: currentUser.id }
        ]
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        staffRole: true,
        isActive: true,
        createdAt: true,
        ownerId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getStaffUsers = async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const ownerId = currentUser.ownerId || currentUser.id;

    const staff = await prisma.user.findMany({
      where: {
        role: 'STAFF',
        ownerId: ownerId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        staffRole: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(staff);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Failed to fetch staff' });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const currentUser = req.user!;
    const user = await prisma.user.findFirst({
      where: {
        id,
        ...(currentUser.role !== 'SUPER_ADMIN' ? {
          OR: [
            { id: currentUser.id },
            { ownerId: currentUser.id }
          ]
        } : {})
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        staffRole: true,
        isActive: true,
        createdAt: true,
        ownerId: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found or unauthorized' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const currentUser = req.user!;

    // Only ADMIN (Owner) or SUPER_ADMIN can create staff
    if (currentUser.role === 'STAFF') {
      return res.status(403).json({ error: 'Staff members cannot create other users' });
    }

    const { email, password, firstName, lastName, role, staffRole, phoneNumber } = req.body;

    if (!password || !firstName || !phoneNumber) {
      return res.status(400).json({ error: 'Password, First Name, and Phone Number are required' });
    }

    // ------------------------------------------

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email ? email : null,
        password: hashedPassword,
        firstName,
        lastName,
        role: (role || 'STAFF') as Role,
        staffRole: (staffRole || 'GENERAL') as any,
        phoneNumber,
        ownerId: req.user!.id, // Link to current user/owner
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        role: true,
        staffRole: true,
        isActive: true,
        createdAt: true,
        ownerId: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { email, firstName, lastName, role, staffRole, isActive } = req.body;

    // Enforce ownership: Only owner or superadmin can update
    const currentUser = req.user!;

    // Find user by ID and ensure they belong to this owner
    const where: any = { id };
    if (currentUser.role !== 'SUPER_ADMIN') {
      where.OR = [
        { id: currentUser.id },
        { ownerId: currentUser.id }
      ];
    }

    const userToUpdate = await prisma.user.findFirst({ where });

    if (!userToUpdate) return res.status(404).json({ error: 'User not found or unauthorized' });

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        email,
        firstName,
        lastName,
        role,
        staffRole,
        isActive,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        role: true,
        staffRole: true,
        isActive: true,
        createdAt: true,
        ownerId: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const currentUser = req.user!;
    // Only superadmin can delete any user. Owners can only delete their staff.
    const where: any = { id };
    if (currentUser.role !== 'SUPER_ADMIN') {
      where.ownerId = currentUser.id;
    }

    const userToDelete = await prisma.user.findFirst({ where });

    if (!userToDelete) return res.status(404).json({ error: 'User not found or unauthorized' });

    if (id === currentUser.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await prisma.user.delete({
      where: { id },
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const resetPassword = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    const currentUser = req.user!;
    const userToUpdate = await prisma.user.findUnique({ where: { id } });

    if (!userToUpdate) return res.status(404).json({ error: 'User not found' });

    // Only owner or superadmin can reset staff passwords. Staff can reset their own.
    const isOwner = userToUpdate.ownerId === currentUser.id;
    const isSelf = userToUpdate.id === currentUser.id;
    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

    if (!isSuperAdmin && !isOwner && !isSelf) {
      return res.status(403).json({ error: 'Unauthorized to reset password for this user' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

export const updateInvoiceSettings = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.user!.id;
    const { shopName, terms, gstNumber, udyamNumber, address, phone, firstName, lastName, phoneNumber } = req.body;

    // Handle file uploads
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    let logoUrl = undefined;
    let signatureUrl = undefined;
    let brandLogoUrl = undefined;
    let appIconUrl = undefined;

    if (files?.logo?.[0]) {
      logoUrl = `/uploads/users/${files.logo[0].filename}`;
    }

    if (files?.signature?.[0]) {
      signatureUrl = `/uploads/users/${files.signature[0].filename}`;
    }

    if (files?.brandLogo?.[0]) {
      brandLogoUrl = `/uploads/users/${files.brandLogo[0].filename}`;
    }

    if (files?.appIcon?.[0]) {
      appIconUrl = `/uploads/users/${files.appIcon[0].filename}`;
    }

    console.log('[InvoiceSettings] Updating for user:', id);
    console.log('[InvoiceSettings] Body:', req.body);
    console.log('[InvoiceSettings] Files:', files);

    const invoiceSettings = {
      terms: terms || null,
      gstNumber: gstNumber || null,
      udyamNumber: udyamNumber || null,
      address: address || null,
      phone: phone || null,
    };

    const updateData: any = {
      invoiceSettings,
    };

    if (shopName) updateData.shopName = shopName;
    if (logoUrl) updateData.logoUrl = logoUrl;
    if (brandLogoUrl) updateData.brandLogoUrl = brandLogoUrl;
    if (appIconUrl) updateData.appIconUrl = appIconUrl;
    if (signatureUrl) updateData.signatureUrl = signatureUrl;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;

    console.log('[InvoiceSettings] Update data:', updateData);

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        shopName: true,
        logoUrl: true,
        brandLogoUrl: true,
        appIconUrl: true,
        signatureUrl: true,
        invoiceSettings: true,
      }
    });

    console.log('[InvoiceSettings] Success');
    res.json(user);
  } catch (error: any) {
    console.error('[InvoiceSettings] Error:', error);
    res.status(500).json({
      error: 'Failed to update invoice settings',
      message: error.message,
      stack: error.stack
    });
  }
};

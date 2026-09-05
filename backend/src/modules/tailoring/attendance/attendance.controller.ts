import { Response } from 'express';
import prisma from '../../../lib/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';

export const getAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, startDate, endDate, status } = req.query;
    const currentUser = req.user!;
    const requestedUserId = userId as string;

    // Default to own records
    const where: any = { userId: currentUser.id };

    if (requestedUserId && requestedUserId !== currentUser.id) {
      // If requesting another user's attendance, must be the owner
      const targetUser = await prisma.user.findUnique({ where: { id: requestedUserId } }) as any;
      if (!targetUser || (currentUser.role !== 'SUPER_ADMIN' && targetUser.ownerId !== currentUser.id)) {
        return res.status(403).json({ error: 'Unauthorized to view this user\'s attendance' });
      }
      where.userId = requestedUserId;
    }

    if (status) {
      where.status = status;
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            email: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

export const getAttendanceById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;


    const attendance = await prisma.attendance.findFirst({
      where: {
        id,
        user: {
          OR: [
            { id: req.user!.id },
            { ownerId: req.user!.id }
          ]
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            email: true,
          },
        },
      },
    });

    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }

    res.json(attendance);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

export const markAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const {
      userId,
      date,
      status,
      checkInTime,
      checkOutTime,
      notes,
    } = req.body;

    if (!userId || !date || !status) {
      return res.status(400).json({ error: 'User, date, and status are required' });
    }

    // Verify that the user marking it is marking for themselves 
    // (Or implement boutique check if staff profiles exist)
    if (userId !== req.user!.id) {
      return res.status(403).json({ error: 'Cannot mark attendance for others' });
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        userId_date: {
          userId,
          date: new Date(date),
        },
      },
      update: {
        status,
        checkInTime: checkInTime ? new Date(checkInTime) : undefined,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
        notes,
      },
      create: {
        userId,
        date: new Date(date),
        status,
        checkInTime: checkInTime ? new Date(checkInTime) : null,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
        notes,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
          },
        },
      },
    });

    res.status(201).json(attendance);
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
};

export const updateAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const {
      status,
      checkInTime,
      checkOutTime,
      notes,
    } = req.body;

    // Verify ownership: Staff can only update their own. Owners can update their staff's too? 
    // Usually attendance is marked by staff, but let's allow owners too for flexibility.
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        id,
        user: {
          OR: [
            { id: req.user!.id },
            { ownerId: req.user!.id }
          ]
        }
      }
    });

    if (!existingAttendance) {
      return res.status(404).json({ error: 'Attendance record not found or unauthorized' });
    }

    const attendance = await prisma.attendance.update({
      where: { id },
      data: {
        status,
        checkInTime: checkInTime ? new Date(checkInTime) : undefined,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
        notes,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
          },
        },
      },
    });

    res.json(attendance);
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
};

export const deleteAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;


    // Verify ownership
    const attendance = await prisma.attendance.findFirst({
      where: {
        id,
        user: {
          OR: [
            { id: req.user!.id },
            { ownerId: req.user!.id }
          ]
        }
      }
    });

    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found or unauthorized' });
    }

    await prisma.attendance.delete({
      where: { id },
    });

    res.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({ error: 'Failed to delete attendance' });
  }
};

export const getTodayAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findMany({
      where: {
        date: today,
        user: {
          OR: [
            { id: req.user!.ownerId },
            { ownerId: req.user!.ownerId }
          ]
        }
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            email: true,
          },
        },
      },
    });

    const allUsers = await prisma.user.findMany({
      where: {
        OR: [
          { id: req.user!.ownerId },
          { ownerId: req.user!.ownerId }
        ],
        isActive: true
      },
      select: {
        id: true,
        firstName: true,
        email: true,
      },
    });

    const attendanceMap = new Map(attendance.map(a => [a.userId, a]));

    const result = allUsers.map(user => ({
      user,
      attendance: attendanceMap.get(user.id) || null,
    }));

    res.json(result);
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s attendance' });
  }
};

export const getStaffPresentToday = async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const count = await prisma.attendance.count({
      where: {
        date: today,
        status: 'PRESENT',
        user: {
          OR: [
            { id: req.user!.ownerId },
            { ownerId: req.user!.ownerId }
          ]
        }
      },
    });

    res.json({ count });
  } catch (error) {
    console.error('Get staff present today error:', error);
    res.status(500).json({ error: 'Failed to fetch present staff count' });
  }
};

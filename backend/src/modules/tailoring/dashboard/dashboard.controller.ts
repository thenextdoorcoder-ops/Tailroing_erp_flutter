import { Response } from 'express';
// Trigger lint check
import prisma from '../../../lib/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { cacheGet, cacheSet } from '../../../lib/redis';


export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.user?.ownerId;
    if (!ownerId) return res.status(400).json({ error: 'ownerId required' });

    // Try cache first
    const cacheKey = `dash:stats:${ownerId}`;
    const cachedStats = await cacheGet(cacheKey);
    if (cachedStats) {
      return res.json(cachedStats);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const totalCustomers = await prisma.customer.count({
      where: {
        userId: req.user?.ownerId,
        deletedAt: null,
      },
    });

    const totalOrders = await prisma.tailoringOrder.count({
      where: {
        userId: req.user?.ownerId,
        deletedAt: null,
      },
    });

    const staffPresentToday = await prisma.attendance.count({
      where: {
        userId: req.user?.ownerId,
        date: today,
        status: 'PRESENT',
      },
    });

    const upcomingDeliveries = await prisma.tailoringOrder.count({
      where: {
        userId: req.user?.ownerId,
        deletedAt: null,
        dueDate: {
          gte: today,
          lte: nextWeek,
        },
        status: {
          not: 'DELIVERED',
        },
      },
    });

    const overdueOrders = await prisma.tailoringOrder.count({
      where: {
        userId: req.user?.ownerId,
        deletedAt: null,
        dueDate: {
          lt: today,
        },
        status: {
          not: 'DELIVERED',
        },
      },
    });

    const pendingOrders = await prisma.tailoringOrder.count({
      where: {
        userId: req.user?.ownerId,
        deletedAt: null,
        status: {
          not: 'DELIVERED',
        },
      },
    });

    const deliveredOrders = await prisma.tailoringOrder.count({
      where: {
        userId: req.user?.ownerId,
        deletedAt: null,
        status: 'DELIVERED',
      },
    });

    const totalRevenue = await prisma.payment.aggregate({
      where: {
        userId: req.user?.ownerId,
      },
      _sum: {
        amount: true,
      },
    });

    const totalDue = await prisma.tailoringOrder.aggregate({
      where: {
        userId: req.user?.ownerId,
        deletedAt: null,
        status: {
          not: 'DELIVERED',
        },
      },
      _sum: {
        balanceDue: true,
      },
    });

    const ordersByStatus = await prisma.tailoringOrder.groupBy({
      by: ['status'],
      _count: true,
      where: {
        userId: req.user?.ownerId,
        deletedAt: null,
        status: {
          not: 'DELIVERED',
        },
      },
    });

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const ordersThisMonth = await prisma.tailoringOrder.count({
      where: {
        userId: req.user?.ownerId,
        deletedAt: null,
        createdAt: { gte: startOfMonth },
      },
    });

    const activeEnquiries = await prisma.enquiry.count({
      where: { userId: req.user?.ownerId, status: 'OPEN' },
    });

    const stageMap: Record<string, number> = {};
    for (const s of ordersByStatus) {
      stageMap[s.status] = (s as any)._count || 0;
    }

    const recentOrders = await prisma.tailoringOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      where: { userId: req.user?.ownerId, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true, mobile: true } },
        orderItems: true,
      },
    });

    const overdueOrdersList = await prisma.tailoringOrder.findMany({
      take: 5,
      where: {
        userId: req.user?.ownerId,
        deletedAt: null,
        dueDate: { lt: today },
        status: { not: 'DELIVERED' },
      },
      include: {
        customer: { select: { id: true, name: true, mobile: true } },
        orderItems: true,
      },
    });

    const lowStockItemsCount = await prisma.item.count({
      where: {
        userId: req.user?.ownerId,
        stockQuantity: { lte: 5 },
      },
    });

    const statsPayload = {
      totalCustomers,
      totalOrders,
      ordersThisMonth,
      startOfMonth,
      staffPresentToday,
      upcomingDeliveries,
      overdueOrdersCount: overdueOrders,
      overdueOrders: overdueOrdersList,
      pendingOrders,
      deliveredOrders,
      totalRevenue: totalRevenue._sum.amount || 0,
      totalDue: totalDue._sum.balanceDue || 0,
      ordersByStatus,
      activeEnquiries,

      // Mobile Dashboard fields
      totalOrdersToday: totalOrders,
      revenueToday: totalRevenue._sum.amount || 0,
      balanceDueTotal: totalDue._sum.balanceDue || 0,
      activeOrdersCount: pendingOrders,
      ordersByStage: stageMap,
      recentOrders,
      overdueOrdersList,
      lowStockItemsCount,
    };

    // Cache for 5 minutes (300 seconds)
    await cacheSet(cacheKey, statsPayload, 300);

    res.json(statsPayload);
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

export const getRecentOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.tailoringOrder.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      where: {
        userId: req.user?.ownerId,
        deletedAt: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            mobile: true,
            countryCode: true,
          },
        },
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
    });

    res.json(orders);
  } catch (error) {
    console.error('Get recent orders error:', error);
    res.status(500).json({ error: 'Failed to fetch recent orders' });
  }
};

export const getActiveOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { filter, page = 1, limit = 5 } = req.query; // Default to 5 items per "slide"
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;
    const ownerId = req.user?.ownerId;

    if (!ownerId) return res.status(400).json({ error: 'ownerId required' });

    // Try cache first
    const cacheKey = `dash:activeOrders:${ownerId}:${filter || 'all'}:${pageNumber}:${limitNumber}`;
    const cachedData = await cacheGet(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }


    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dateFilter: any = {};

    if (filter === 'thisWeek') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
      endOfWeek.setHours(23, 59, 59, 999);

      dateFilter = {
        gte: startOfWeek,
        lte: endOfWeek,
      };
    } else if (filter === 'thisMonth') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      dateFilter = {
        gte: startOfMonth,
        lte: endOfMonth,
      };
    } else if (filter === 'nextWeek') {
      const startOfNextWeek = new Date(today);
      startOfNextWeek.setDate(today.getDate() - today.getDay() + 7); // Next Sunday
      const endOfNextWeek = new Date(startOfNextWeek);
      endOfNextWeek.setDate(startOfNextWeek.getDate() + 6); // Next Saturday
      endOfNextWeek.setHours(23, 59, 59, 999);

      dateFilter = {
        gte: startOfNextWeek,
        lte: endOfNextWeek,
      };
    }

    const where = {
      userId: req.user?.ownerId,
      deletedAt: null,
      status: {
        notIn: ['DELIVERED', 'CANCELLED'] as import('@prisma/client').TailoringOrderStatus[],
      },
      ...(Object.keys(dateFilter).length > 0 ? { dueDate: dateFilter } : {}),
    };

    const [orders, total] = await prisma.$transaction([
      prisma.tailoringOrder.findMany({
        take: limitNumber,
        skip,
        orderBy: { dueDate: 'asc' }, // Show most urgent first
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              mobile: true,
              countryCode: true,
            },
          },
          _count: {
            select: {
              orderItems: true,
            },
          },
          attender: {
            select: {
              id: true,
              name: true,
            }
          },
          workAssignments: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                }
              }
            }
          }
        },
      }),
      prisma.tailoringOrder.count({ where }),
    ]);

    const payload = {
      data: orders,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    };

    // Cache for 5 minutes
    await cacheSet(cacheKey, payload, 300);

    res.json(payload);
  } catch (error) {
    console.error('Get active orders error:', error);
    res.status(500).json({ error: 'Failed to fetch active orders' });
  }
};

export const getUpcomingDeliveriesForDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.user?.ownerId;
    if (!ownerId) return res.status(400).json({ error: 'ownerId required' });

    const cacheKey = `dash:upcomingDeliveries:${ownerId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const orders = await prisma.tailoringOrder.findMany({
      where: {
        userId: req.user?.ownerId,
        deletedAt: null,
        dueDate: {
          gte: today,
          lte: nextWeek,
        },
        status: {
          not: 'DELIVERED',
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            mobile: true,
            countryCode: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    await cacheSet(cacheKey, orders, 300);
    res.json(orders);
  } catch (error) {
    console.error('Get upcoming deliveries error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming deliveries' });
  }
};

export const getOverdueOrdersForDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const ownerId = req.user?.ownerId;
    if (!ownerId) return res.status(400).json({ error: 'ownerId required' });

    const cacheKey = `dash:overdueOrders:${ownerId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const orders = await prisma.tailoringOrder.findMany({
      where: {
        userId: req.user?.ownerId,
        deletedAt: null,
        dueDate: {
          lt: today,
        },
        status: {
          not: 'DELIVERED',
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            mobile: true,
            countryCode: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    });

    await cacheSet(cacheKey, orders, 300);
    res.json(orders);
  } catch (error) {
    console.error('Get overdue orders error:', error);
    res.status(500).json({ error: 'Failed to fetch overdue orders' });
  }
};

export const getOrderBookingSummary = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {
      userId: req.user?.ownerId,
      deletedAt: null,
    };

    if (startDate && endDate) {
      where.orderDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const summary = await prisma.tailoringOrder.aggregate({
      where,
      _sum: {
        grandTotal: true,
        advancePaid: true,
        balanceDue: true,
      },
      _count: true,
    });

    const byStatus = await prisma.tailoringOrder.groupBy({
      by: ['status'],
      where,
      _count: true,
      _sum: {
        grandTotal: true,
      },
    });

    res.json({
      totalOrders: summary._count,
      totalAmount: summary._sum.grandTotal || 0,
      totalPaid: summary._sum.advancePaid || 0,
      totalDue: summary._sum.balanceDue || 0,
      byStatus,
    });
  } catch (error) {
    console.error('Get order booking summary error:', error);
    res.status(500).json({ error: 'Failed to fetch order booking summary' });
  }
};

export const getRevenueReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {
      userId: req.user?.ownerId,
    };

    if (startDate && endDate) {
      where.paymentDate = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const revenue = await prisma.payment.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    const expenses = await prisma.expense.aggregate({
      where: {
        userId: req.user?.ownerId,
        ...(startDate && endDate ? {
          expenseDate: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string),
          },
        } : {}),
      },
      _sum: {
        amount: true,
      },
    });

    const revenueAmount = parseFloat(revenue._sum.amount?.toString() || '0');
    const expenseAmount = parseFloat(expenses._sum.amount?.toString() || '0');
    const profit = revenueAmount - expenseAmount;

    res.json({
      revenue: revenueAmount,
      expenses: expenseAmount,
      profit,
    });
  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({ error: 'Failed to fetch revenue report' });
  }
};

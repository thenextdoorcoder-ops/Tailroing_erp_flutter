import { Response } from "express";
import { Prisma } from "@prisma/client";
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import prisma from '../../../lib/prisma';

/* =========================================================
   DAILY SALES REPORT
========================================================= */
export const getDailySalesReport = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { date } = req.query;

    const reportDate = date ? new Date(String(date)) : new Date();

    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    const ordersToday = await prisma.tailoringOrder.findMany({
      where: {
        userId: req.user!.ownerId,
        orderDate: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        customer: {
          select: { name: true, mobile: true },
        },
        orderItems: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const paymentsToday = await prisma.payment.findMany({
      where: {
        userId: req.user!.ownerId,
        paymentDate: { gte: startOfDay, lte: endOfDay },
      },
    });

    const expensesToday = await prisma.expense.findMany({
      where: {
        userId: req.user!.ownerId,
        expenseDate: { gte: startOfDay, lte: endOfDay },
      },
    });

    // 🔹 Use loop instead of reduce (strict safest)
    let totalOrdersValue = 0;
    for (const order of ordersToday) {
      totalOrdersValue += Number(order.grandTotal);
    }

    let totalPaymentsReceived = 0;
    for (const payment of paymentsToday) {
      totalPaymentsReceived += Number(payment.amount);
    }

    let totalExpenses = 0;
    let totalStaffSalary = 0;
    for (const expense of expensesToday) {
      if (expense.category === 'Staff Salary') {
        totalStaffSalary += Number(expense.amount);
      } else {
        totalExpenses += Number(expense.amount);
      }
    }

    // Category Breakdown
    const categoryStats: Record<string, { orders: number; items: number; revenue: number }> = {};

    for (const order of ordersToday) {
      for (const item of order.orderItems) {
        const categoryName = item.product?.category?.name || 'Uncategorized';

        if (!categoryStats[categoryName]) {
          categoryStats[categoryName] = { orders: 0, items: 0, revenue: 0 };
        }

        // Note: Counting orders per category is tricky as an order can have multiple categories.
        // We will just increment item count and revenue here.
        categoryStats[categoryName].items += item.quantity;
        categoryStats[categoryName].revenue += Number(item.total);
      }
    }

    // Convert to array
    const categoryBreakdown = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      orders: ordersToday.filter(o => o.orderItems.some(i => (i.product?.category?.name || 'Uncategorized') === category)).length, // Count unique orders for this category
      items: stats.items,
      revenue: stats.revenue,
    }));

    return res.json({
      date: reportDate,
      summary: {
        totalOrders: ordersToday.length,
        totalOrdersValue,
        totalPaymentsReceived,
        totalExpenses,
        totalStaffSalary,
        grossProfit: totalPaymentsReceived - totalExpenses,
        netProfit: totalPaymentsReceived - totalExpenses - totalStaffSalary,
      },
      categoryBreakdown,
      orders: ordersToday,
      payments: paymentsToday,
      expenses: expensesToday,
    });
  } catch (error) {
    console.error("Daily sales report error:", error);
    return res.status(500).json({ error: "Failed to generate daily sales report" });
  }
};

/* =========================================================
   MONTHLY REVENUE REPORT
========================================================= */
export const getMonthlyRevenueReport = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { year, month } = req.query;

    const reportYear = year ? Number(year) : new Date().getFullYear();
    const reportMonth = month ? Number(month) : new Date().getMonth() + 1;

    const startDate = new Date(reportYear, reportMonth - 1, 1);
    const endDate = new Date(reportYear, reportMonth, 0, 23, 59, 59, 999);

    const ordersInMonth = await prisma.tailoringOrder.findMany({
      where: {
        userId: req.user!.ownerId,
        orderDate: { gte: startDate, lte: endDate },
      },
    });

    const paymentsInMonth = await prisma.payment.findMany({
      where: {
        userId: req.user!.ownerId,
        paymentDate: { gte: startDate, lte: endDate },
      },
    });

    const expensesInMonth = await prisma.expense.findMany({
      where: {
        userId: req.user!.ownerId,
        expenseDate: { gte: startDate, lte: endDate },
      },
    });

    let totalOrdersValue = 0;
    for (const order of ordersInMonth) {
      totalOrdersValue += Number(order.grandTotal);
    }

    let totalPayments = 0;
    for (const payment of paymentsInMonth) {
      totalPayments += Number(payment.amount);
    }

    let totalExpenses = 0;
    let totalStaffSalary = 0;
    for (const expense of expensesInMonth) {
      if (expense.category === 'Staff Salary') {
        totalStaffSalary += Number(expense.amount);
      } else {
        totalExpenses += Number(expense.amount);
      }
    }

    // 🔹 Strict-safe status grouping
    const ordersByStatus: Record<
      string,
      { count: number; value: number }
    > = {};

    for (const order of ordersInMonth) {
      const status = order.status;

      if (!ordersByStatus[status]) {
        ordersByStatus[status] = { count: 0, value: 0 };
      }

      ordersByStatus[status].count += 1;
      ordersByStatus[status].value += Number(order.grandTotal);
    }

    // Daily Breakdown
    const daysInMonth = new Date(reportYear, reportMonth, 0).getDate();
    const dailyBreakdown = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDateStart = new Date(reportYear, reportMonth - 1, day);
      const currentDateEnd = new Date(reportYear, reportMonth - 1, day, 23, 59, 59, 999);

      // Filter for this day
      // Note: We could optimize this by grouping in the DB, but JS filtering is fine for typical small business volume
      const dayOrders = ordersInMonth.filter(o => {
        const d = new Date(o.orderDate);
        return d >= currentDateStart && d <= currentDateEnd;
      });
      const dayPayments = paymentsInMonth.filter(p => {
        const d = new Date(p.paymentDate);
        return d >= currentDateStart && d <= currentDateEnd;
      });
      const dayExpenses = expensesInMonth.filter(e => {
        const d = new Date(e.expenseDate);
        return d >= currentDateStart && d <= currentDateEnd;
      });

      const dayRevenue = dayPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const dayExpenseTotal = dayExpenses.filter(e => e.category !== 'Staff Salary').reduce((sum, e) => sum + Number(e.amount), 0);
      const dayStaffSalary = dayExpenses.filter(e => e.category === 'Staff Salary').reduce((sum, e) => sum + Number(e.amount), 0);

      const dayGrossProfit = dayRevenue - dayExpenseTotal;

      dailyBreakdown.push({
        date: formatDate(currentDateStart),
        day: day,
        orders: dayOrders.length,
        payments: dayRevenue,
        expenses: dayExpenseTotal,
        staffSalary: dayStaffSalary,
        grossProfit: dayGrossProfit,
        netProfit: dayGrossProfit - dayStaffSalary
      });
    }

    // Helper to format date YYYY-MM-DD
    function formatDate(date: Date) {
      return date.toISOString().split('T')[0];
    }

    return res.json({
      year: reportYear,
      month: reportMonth,
      summary: {
        totalOrders: ordersInMonth.length,
        totalOrdersValue,
        totalPayments,
        totalExpenses,
        totalStaffSalary,
        grossProfit: totalPayments - totalExpenses,
        netProfit: totalPayments - totalExpenses - totalStaffSalary,
        averageOrderValue:
          ordersInMonth.length > 0
            ? totalOrdersValue / ordersInMonth.length
            : 0,
      },
      ordersByStatus,
      dailyBreakdown,
    });
  } catch (error) {
    console.error("Monthly revenue report error:", error);
    return res.status(500).json({ error: "Failed to generate monthly revenue report" });
  }
};


/* =========================================================
   INVENTORY REPORT (STRICT SAFE VERSION)
========================================================= */
export const getInventoryReport = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const items = await prisma.item.findMany({
      where: { userId: req.user!.ownerId },
      include: {
        category: true,
        subCategory: true,
        unit: true,
      },
    });

    // ✅ Explicit type for items with includes
    type ItemWithRelations = Prisma.ItemGetPayload<{
      include: {
        category: true;
        subCategory: true;
        unit: true;
      };
    }>;

    const itemStats = (items as ItemWithRelations[]).map((item) => {
      const stockQuantity = Number(item.stockQuantity);
      const purchasePrice = Number(item.purchasePrice);
      const sellingPrice = Number(item.sellingPrice);

      const stockValue = stockQuantity * purchasePrice;
      const potentialRevenue = stockQuantity * sellingPrice;
      const potentialProfit = potentialRevenue - stockValue;

      const status =
        stockQuantity === 0
          ? "OUT_OF_STOCK"
          : stockQuantity < 10
            ? "LOW_STOCK"
            : "IN_STOCK";

      return {
        id: item.id,
        itemId: item.itemId,
        name: item.name,
        category: item.category?.name || 'Uncategorized',
        subCategory: item.subCategory?.name || 'None',
        stockQuantity,
        unit: item.unit?.symbol || 'pcs',
        purchasePrice,
        sellingPrice,
        stockValue,
        potentialRevenue,
        potentialProfit,
        status,
      };
    });

    // ✅ Extract type from mapped array
    type ItemStatsType = (typeof itemStats)[number];

    const totalStockValue = itemStats.reduce(
      (sum: number, item: ItemStatsType) => sum + item.stockValue,
      0
    );

    const totalPotentialRevenue = itemStats.reduce(
      (sum: number, item: ItemStatsType) => sum + item.potentialRevenue,
      0
    );

    const totalPotentialProfit = itemStats.reduce(
      (sum: number, item: ItemStatsType) => sum + item.potentialProfit,
      0
    );

    return res.json({
      summary: {
        totalItems: items.length,
        inStock: itemStats.filter(
          (i: ItemStatsType) => i.status === "IN_STOCK"
        ).length,
        lowStock: itemStats.filter(
          (i: ItemStatsType) => i.status === "LOW_STOCK"
        ).length,
        outOfStock: itemStats.filter(
          (i: ItemStatsType) => i.status === "OUT_OF_STOCK"
        ).length,
        totalStockValue,
        totalPotentialRevenue,
        totalPotentialProfit,
      },
      lowStockItems: itemStats.filter((i: ItemStatsType) => i.status !== "IN_STOCK"), // Include both low and out of stock
      items: itemStats,
    });
  } catch (error) {
    console.error("Inventory report error:", error);
    return res
      .status(500)
      .json({ error: "Failed to generate inventory report" });
  }
};


/* =========================================================
   CUSTOMER REPORT (STRICT SAFE VERSION)
========================================================= */
export const getCustomerReport = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { userId: req.user!.ownerId },
      include: {
        orders: {
          include: {
            payments: true,
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // ✅ Properly extract types from Prisma result
    type CustomerType = (typeof customers)[number];
    type OrderType = CustomerType["orders"][number];
    type PaymentType = OrderType["payments"][number];

    const customerStats = customers.map((customer: CustomerType) => {

      const totalOrderValue = customer.orders.reduce(
        (sum: number, order: OrderType) =>
          sum + Number(order.grandTotal),
        0
      );

      const totalPaid = customer.orders.reduce(
        (sum: number, order: OrderType) =>
          sum +
          order.payments.reduce(
            (pSum: number, payment: PaymentType) =>
              pSum + Number(payment.amount),
            0
          ),
        0
      );

      const totalDue = customer.orders.reduce(
        (sum: number, order: OrderType) =>
          sum + Number(order.balanceDue),
        0
      );

      return {
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
        createdAt: customer.createdAt,
        totalOrders: customer._count.orders,
        totalOrderValue,
        totalPaid,
        totalDue,
      };
    });

    // 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newCustomers = customerStats.filter(c => new Date(c.createdAt) >= thirtyDaysAgo).length;
    const activeCustomers = customerStats.filter(c => c.totalOrders > 0).length;

    // Sort by totalOrderValue descending for Top Customers
    const topCustomers = [...customerStats]
      .sort((a, b) => b.totalOrderValue - a.totalOrderValue)
      .slice(0, 10);

    const customersWithDues = customerStats.filter(c => c.totalDue > 0);

    return res.json({
      totalCustomers: customers.length,
      newCustomers,
      activeCustomers,
      customersWithDues,
      topCustomers,
      customers: customerStats,
    });

  } catch (error) {
    console.error("Customer report error:", error);
    return res.status(500).json({ error: "Failed to generate customer report" });
  }
};


/* =========================================================
   EXPORT REPORT
========================================================= */
export const exportReport = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { reportType } = req.query;

    switch (reportType) {
      case "daily":
        return getDailySalesReport(req, res);

      case "monthly":
        return getMonthlyRevenueReport(req, res);

      case "customer":
        return getCustomerReport(req, res);

      case "inventory":
        return getInventoryReport(req, res);

      default:
        return res.status(400).json({ error: "Invalid report type" });
    }
  } catch (error) {
    console.error("Export report error:", error);
    return res.status(500).json({ error: "Failed to export report" });
  }
};

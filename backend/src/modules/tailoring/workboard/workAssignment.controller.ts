import prisma from '../../../lib/prisma';
import { Response } from "express";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

/* =========================================================
   GET WORK ASSIGNMENTS
========================================================= */
export const getWorkAssignments = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { orderId, userId, stage } = req.query;
    const currentUser = req.user!;

    // 1. If staff: only see their OWN assignments
    if (currentUser.role === 'STAFF') {
      const where: any = { userId: currentUser.id };
      if (orderId) where.orderId = String(orderId);
      if (stage && stage !== "ALL") where.stage = stage as any;

      const assignments = await prisma.workAssignment.findMany({
        where,
        include: {
          order: { include: { customer: { select: { id: true, name: true, mobile: true } } } },
          user: { select: { id: true, firstName: true } },
        },
        orderBy: { assignedAt: "desc" },
      });
      return res.json(assignments);
    }

    // 2. If owner: see assignments for their OWN orders
    const where: any = {
      order: { userId: currentUser.id }
    };

    if (orderId) where.orderId = String(orderId);
    if (userId) {
      // If filtering by specific staff, check if they belong to this owner
      const targetUser = await prisma.user.findUnique({ where: { id: String(userId) } }) as any;
      if (!targetUser || (currentUser.role !== 'SUPER_ADMIN' && targetUser.ownerId !== currentUser.id)) {
        return res.status(403).json({ error: 'Unauthorized to view this staff member\'s work' });
      }
      where.userId = String(userId);
    }
    if (stage && stage !== "ALL") where.stage = stage as any;

    const assignments = await prisma.workAssignment.findMany({
      where,
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                mobile: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    return res.json(assignments);
  } catch (error) {
    console.error("Get work assignments error:", error);
    return res.status(500).json({ error: "Failed to fetch work assignments" });
  }
};

/* =========================================================
   GET SINGLE WORK ASSIGNMENT
========================================================= */
export const getWorkAssignmentById = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const rawId = req.params.id;

    if (!rawId || Array.isArray(rawId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const id: string = rawId;

    const assignment = await prisma.workAssignment.findFirst({
      where: {
        id,
        order: { userId: req.user!.ownerId }
      },
      include: {
        order: { include: { customer: true } },
        user: { select: { id: true, firstName: true, email: true } },
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: "Work assignment not found" });
    }

    return res.json(assignment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch work assignment" });
  }
};


/* =========================================================
   CREATE WORK ASSIGNMENT
========================================================= */
export const createWorkAssignment = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { orderId, userId, stage, notes } = req.body;

    if (!orderId || !userId || !stage) {
      return res
        .status(400)
        .json({ error: "Order, user, and stage are required" });
    }

    // Verify order ownership
    const order = await prisma.tailoringOrder.findFirst({
      where: { id: orderId, userId: req.user!.ownerId }
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const assignment = await prisma.workAssignment.create({
      data: {
        orderId,
        userId,
        stage,
        notes,
      },
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
          },
        },
      },
    });

    return res.status(201).json(assignment);
  } catch (error) {
    console.error("Create work assignment error:", error);
    return res.status(500).json({ error: "Failed to create work assignment" });
  }
};

/* =========================================================
   UPDATE WORK ASSIGNMENT
========================================================= */
export const updateWorkAssignment = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const rawId = req.params.id;

    if (!rawId || Array.isArray(rawId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const id: string = rawId;

    const { userId, stage, completedAt, notes } = req.body;

    // Verify ownership
    const existingAssignment = await prisma.workAssignment.findFirst({
      where: { id, order: { userId: req.user!.ownerId } }
    });

    if (!existingAssignment) {
      return res.status(404).json({ error: "Work assignment not found" });
    }

    const assignment = await prisma.workAssignment.update({
      where: { id },
      data: {
        userId,
        stage,
        completedAt: completedAt ? new Date(completedAt) : undefined,
        notes,
      },
    });

    return res.json(assignment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to update work assignment" });
  }
};


/* =========================================================
   COMPLETE WORK ASSIGNMENT
========================================================= */
export const completeWorkAssignment = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const rawId = req.params.id;

    if (!rawId || Array.isArray(rawId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const id: string = rawId;

    // Verify ownership
    const existingAssignment = await prisma.workAssignment.findFirst({
      where: { id, order: { userId: req.user!.ownerId } }
    });

    if (!existingAssignment) {
      return res.status(404).json({ error: "Work assignment not found" });
    }

    const assignment = await prisma.workAssignment.update({
      where: { id },
      data: { completedAt: new Date() },
    });

    return res.json(assignment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to complete work assignment" });
  }
};


/* =========================================================
   DELETE WORK ASSIGNMENT
========================================================= */
export const deleteWorkAssignment = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const rawId = req.params.id;

    if (!rawId || Array.isArray(rawId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const id: string = rawId;

    // Verify ownership
    const assignment = await prisma.workAssignment.findFirst({
      where: { id, order: { userId: req.user!.ownerId } }
    });

    if (!assignment) {
      return res.status(404).json({ error: "Work assignment not found" });
    }

    await prisma.workAssignment.delete({
      where: { id },
    });

    return res.json({ message: "Work assignment deleted successfully" });
  } catch (error) {
    console.error("Delete work assignment error:", error);
    return res.status(500).json({ error: "Failed to delete work assignment" });
  }
};

/* =========================================================
   GET STAFF LEDGER (STRICT SAFE GROUPED VERSION)
========================================================= */
export const getStaffLedger = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { userId, startDate, endDate } = req.query;

    // ✅ Proper Prisma where typing
    const where: any = {
      order: { userId: req.user!.ownerId }
    };

    if (userId) {
      where.userId = String(userId);
    }

    if (startDate && endDate) {
      where.assignedAt = {
        gte: new Date(String(startDate)),
        lte: new Date(String(endDate)),
      };
    }

    const assignments = await prisma.workAssignment.findMany({
      where,
      include: {
        order: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    // ✅ Extract proper type from Prisma result
    type AssignmentType = (typeof assignments)[number];

    type GroupedType = Record<
      string,
      {
        user: AssignmentType["user"];
        assignments: AssignmentType[];
        completed: number;
        pending: number;
      }
    >;

    // ✅ Fully typed reduce (NO GENERICS, NO ERRORS)
    const grouped: GroupedType = {};

    for (const assignment of assignments) {
      const staffId = assignment.userId;

      if (!grouped[staffId]) {
        grouped[staffId] = {
          user: assignment.user,
          assignments: [],
          completed: 0,
          pending: 0,
        };
      }

      grouped[staffId].assignments.push(assignment);

      if (assignment.completedAt) {
        grouped[staffId].completed++;
      } else {
        grouped[staffId].pending++;
      }
    }

    return res.json(Object.values(grouped));

  } catch (error) {
    console.error("Get staff ledger error:", error);
    return res.status(500).json({ error: "Failed to fetch staff ledger" });
  }
};

export const getProductionQueue = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { stage, search } = req.query;

    const where: any = {
      userId: req.user!.ownerId,
      status: {
        not: "DELIVERED",
      },
    };

    if (stage && stage !== "ALL") {
      where.status = stage;
    }

    if (search) {
      where.OR = [
        { orderId: { contains: String(search), mode: "insensitive" } },
        { customer: { name: { contains: String(search), mode: "insensitive" } } },
      ];
    }

    const orders = await prisma.tailoringOrder.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            mobile: true,
          },
        },
        workAssignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
              },
            },
          },
          orderBy: { assignedAt: "desc" },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    return res.json(orders);

  } catch (error) {
    console.error("Get production queue error:", error);
    return res.status(500).json({ error: "Failed to fetch production queue" });
  }
};

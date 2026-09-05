import { Response } from 'express';
import prisma from '../../../lib/prisma';
import { MeasurementType } from "@prisma/client";
import { AuthRequest } from "../../shared/middleware/auth.middleware";

/* =========================================================
   Helper: safely extract string from params/query
========================================================= */
const getString = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

/* =========================================================
   Get all measurements for a customer
========================================================= */
export const getCustomerMeasurements = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const customerId = getString(req.params.customerId);
    const typeParam = getString(req.query.type);

    if (!customerId) {
      return res.status(400).json({ error: "Customer ID is required" });
    }

    const measurements = await prisma.measurement.findMany({
      where: {
        customerId,
        customer: { userId: req.user!.ownerId },
        ...(typeParam && { type: typeParam as MeasurementType }),
      },
      include: {
        order: {
          select: {
            orderId: true,
            orderDate: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(measurements);
  } catch (error) {
    console.error("Get customer measurements error:", error);
    res.status(500).json({ error: "Failed to fetch measurements" });
  }
};

/* =========================================================
   Search measurements by phone or name
========================================================= */
export const searchMeasurements = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const queryParam = getString(req.query.query);
    const typeParam = getString(req.query.type);

    const whereClause: any = {
      userId: req.user!.ownerId,
      deletedAt: null,
    };

    if (queryParam && queryParam.trim()) {
      whereClause.OR = [
        { mobile: { contains: queryParam } },
        { name: { contains: queryParam, mode: "insensitive" } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        measurement: {
          ...(typeParam && {
            where: { type: typeParam as MeasurementType },
          }),
          orderBy: { createdAt: "desc" },
          include: {
            order: {
              select: {
                orderId: true,
                orderDate: true,
              },
            },
          },
        },
      },
    });

    const results = customers.flatMap((customer) =>
      customer.measurement.map((measurement) => ({
        ...measurement,
        customerName: customer.name,
        customerMobile: customer.mobile,
      }))
    );

    res.json(results);
  } catch (error) {
    console.error("Search measurements error:", error);
    res.status(500).json({ error: "Failed to search measurements" });
  }
};

/* =========================================================
   Get measurement by ID
========================================================= */
export const getMeasurementById = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const id = getString(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Measurement ID is required" });
    }

    const measurement = await prisma.measurement.findFirst({
      where: {
        id,
        customer: { userId: req.user!.ownerId }
      },
      include: {
        customer: {
          select: { id: true, name: true, mobile: true },
        },
        order: {
          select: { orderId: true, orderDate: true },
        },
      },
    });

    if (!measurement) {
      return res.status(404).json({ error: "Measurement not found" });
    }

    res.json(measurement);
  } catch (error) {
    console.error("Get measurement error:", error);
    res.status(500).json({ error: "Failed to fetch measurement" });
  }
};

/* =========================================================
   Create measurement
========================================================= */
export const createMeasurement = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { customerId, orderId, type, data, notes } = req.body;

    if (!customerId || !type || !data) {
      return res.status(400).json({
        error: "Customer ID, type, and measurement data are required",
      });
    }

    // Harden multi-tenancy: Verify customer belongs to this user
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: req.user!.ownerId }
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found or access denied" });
    }

    const measurement = await prisma.measurement.create({
      data: {
        customerId,
        orderId: orderId || null,
        type: type as MeasurementType,
        data,
        notes,
        categoryId: req.body.categoryId || null,
        subCategoryId: req.body.subCategoryId || null,
      },
      include: {
        customer: {
          select: { id: true, name: true, mobile: true },
        },
        order: {
          select: { orderId: true },
        },
      },
    });

    res.status(201).json(measurement);
  } catch (error) {
    console.error("Create measurement error:", error);
    res.status(500).json({ error: "Failed to create measurement" });
  }
};

/* =========================================================
   Update measurement
========================================================= */
export const updateMeasurement = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const id = getString(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Measurement ID is required" });
    }

    const { data, notes } = req.body;

    if (!data) {
      return res.status(400).json({
        error: "Measurement data is required",
      });
    }

    const measurement = await prisma.measurement.update({
      where: {
        id,
        customer: { userId: req.user!.ownerId }
      },
      data: { data, notes },
    });

    res.json(measurement);
  } catch (error) {
    console.error("Update measurement error:", error);
    res.status(500).json({ error: "Failed to update measurement" });
  }
};

/* =========================================================
   Delete measurement
========================================================= */
export const deleteMeasurement = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const id = getString(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "Measurement ID is required" });
    }

    await prisma.measurement.delete({
      where: {
        id,
        customer: { userId: req.user!.ownerId }
      },
    });

    res.json({ message: "Measurement deleted successfully" });
  } catch (error) {
    console.error("Delete measurement error:", error);
    res.status(500).json({ error: "Failed to delete measurement" });
  }
};

/* =========================================================
   Get latest measurement by type
========================================================= */
export const getLatestMeasurement = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const customerId = getString(req.params.customerId);
    const typeParam = getString(req.query.type);
    const subCategoryId = getString(req.query.subCategoryId);

    if (!customerId || !typeParam) {
      return res.status(400).json({
        error: "Customer ID and measurement type are required",
      });
    }

    const measurement = await prisma.measurement.findFirst({
      where: {
        customerId,
        customer: { userId: req.user!.ownerId },
        type: typeParam as MeasurementType,
        ...(subCategoryId && { subCategoryId }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            orderId: true,
            orderDate: true,
          },
        },
      },
    });

    if (!measurement) {
      return res.status(404).json({ error: "No measurement found" });
    }

    res.json(measurement);
  } catch (error) {
    console.error("Get latest measurement error:", error);
    res.status(500).json({ error: "Failed to fetch latest measurement" });
  }
};

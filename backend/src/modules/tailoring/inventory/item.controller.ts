import { Response } from "express";
import { Prisma } from '@prisma/client';
import { AuthRequest } from "../../shared/middleware/auth.middleware";
import prisma from '../../../lib/prisma';

/* =====================================================
   Generate Item Code
===================================================== */
const generateItemId = async (userId: string): Promise<string> => {
  const lastItem = await prisma.item.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  let sequence = 1;

  if (lastItem?.itemId) {
    const lastSequence = parseInt(lastItem.itemId.replace("ITM", ""));
    sequence = lastSequence + 1;
  }

  return `ITM${sequence.toString().padStart(5, "0")}`;
};

/* =====================================================
   Get All Items
===================================================== */
export const getItems = async (req: AuthRequest, res: Response) => {
  try {
    const { search, categoryId, subCategoryId } = req.query;

    const where: any = { userId: req.user!.ownerId, deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { itemId: { contains: String(search), mode: "insensitive" } },
      ];
    }

    if (categoryId) where.categoryId = String(categoryId);
    if (subCategoryId) where.subCategoryId = String(subCategoryId);

    const items = await prisma.item.findMany({
      where,
      include: {
        category: true,
        subCategory: true,
        unit: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(items);
  } catch (error) {
    console.error("Get items error:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
};

/* =====================================================
   Get Single Item
===================================================== */
export const getItemById = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    const item = await prisma.item.findFirst({
      where: {
        id,
        userId: req.user!.ownerId,
        deletedAt: null
      },
      include: {
        category: true,
        subCategory: true,
        unit: true,
        itemGallery: true,
      },
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item);
  } catch (error) {
    console.error("Get item error:", error);
    res.status(500).json({ error: "Failed to fetch item" });
  }
};

/* =====================================================
   Create Item
===================================================== */
export const createItem = async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      categoryId,
      subCategoryId,
      unitId,
      stockQuantity,
      purchasePrice,
      sellingPrice,
    } = req.body;

    if (!name || !categoryId || !unitId) {
      return res
        .status(400)
        .json({ error: "Name, category, and unit are required" });
    }

    const itemId = await generateItemId(req.user!.ownerId);

    const item = await prisma.item.create({
      data: {
        itemId,
        name,
        categoryId,
        subCategoryId: subCategoryId || null,
        unitId,
        stockQuantity: Number(stockQuantity) || 0,
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        lastRestockDate:
          Number(stockQuantity) > 0 ? new Date() : null,
        userId: req.user!.ownerId,
      },
      include: {
        category: true,
        subCategory: true,
        unit: true,
      },
    });

    res.status(201).json(item);
  } catch (error) {
    console.error("Create item error:", error);
    res.status(500).json({ error: "Failed to create item" });
  }
};

/* =====================================================
   Update Item
===================================================== */
export const updateItem = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    const existingItem = await prisma.item.findFirst({
      where: {
        id,
        userId: req.user!.ownerId,
        deletedAt: null
      },
    });

    if (!existingItem) {
      return res.status(404).json({ error: "Item not found" });
    }

    const {
      name,
      categoryId,
      subCategoryId,
      unitId,
      stockQuantity,
      purchasePrice,
      sellingPrice,
    } = req.body;

    const updateData: any = {
      name,
      categoryId,
      subCategoryId: subCategoryId || null,
      unitId,
      purchasePrice: purchasePrice ? Number(purchasePrice) : undefined,
      sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
    };

    if (stockQuantity !== undefined) {
      updateData.stockQuantity = Number(stockQuantity);

      if (
        Number(stockQuantity) >
        Number(existingItem.stockQuantity)
      ) {
        updateData.lastRestockDate = new Date();
      }
    }

    const item = await prisma.item.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        subCategory: true,
        unit: true,
      },
    });

    res.json(item);
  } catch (error) {
    console.error("Update item error:", error);
    res.status(500).json({ error: "Failed to update item" });
  }
};

/* =====================================================
   Delete Item
===================================================== */
export const deleteItem = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);

    // Verify ownership
    const item = await prisma.item.findFirst({
      where: { id, userId: req.user!.ownerId, deletedAt: null }
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    await prisma.item.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Delete item error:", error);
    res.status(500).json({ error: "Failed to delete item" });
  }
};

/* =====================================================
   Items Summary (STRICT SAFE VERSION)
===================================================== */

export const getItemsSummary = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const items = await prisma.item.findMany({
      where: { userId: req.user!.ownerId, deletedAt: null },
      select: {
        stockQuantity: true,
        purchasePrice: true,
        sellingPrice: true,
      },
    });

    const purchaseTotal = items.reduce(
      (total: number, item: typeof items[number]) => {
        return (
          total +
          Number(item.stockQuantity) *
          Number(item.purchasePrice)
        );
      },
      0
    );

    const sellingTotal = items.reduce(
      (total: number, item: typeof items[number]) => {
        return (
          total +
          Number(item.stockQuantity) *
          Number(item.sellingPrice)
        );
      },
      0
    );

    return res.json({
      totalItems: items.length,
      totalPurchaseAmount: purchaseTotal,
      totalSellingAmount: sellingTotal,
      estimatedProfit: sellingTotal - purchaseTotal,
    });

  } catch (error) {
    console.error('Get items summary error:', error);
    return res.status(500).json({ error: 'Failed to fetch items summary' });
  }
};


/* =====================================================
   Upload Item Gallery
===================================================== */
export const uploadItemGallery = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const rawItemId = req.params.itemId;

    if (!rawItemId || Array.isArray(rawItemId)) {
      return res.status(400).json({ error: "Invalid itemId" });
    }

    if (!req.file) {
      return res
        .status(400)
        .json({ error: "Image file is required" });
    }

    const gallery = await prisma.itemGallery.create({
      data: {
        itemId: rawItemId,
        imagePath: req.file.path,
        description: req.body.description,
      },
    });

    res.status(201).json(gallery);
  } catch (error) {
    console.error("Upload item gallery error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
};

/* =====================================================
   Delete Gallery Image
===================================================== */
export const deleteItemGallery = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const id = String(req.params.id);

    await prisma.itemGallery.delete({
      where: { id },
    });

    res.json({ message: "Gallery image deleted successfully" });
  } catch (error) {
    console.error("Delete item gallery error:", error);
    res.status(500).json({
      error: "Failed to delete gallery image",
    });
  }
};

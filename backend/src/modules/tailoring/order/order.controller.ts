import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { emailService } from '../../shared/services/email.service';
import { whatsappService } from '../../shared/services/whatsapp.service';
import prisma from '../../../lib/prisma';
import { sanitizeObject } from '../../shared/utils/sanitize.util';
import { cacheDelByPrefix } from '../../../lib/redis';

const generateOrderId = async (userId: string): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');

  const prefix = `ORD${year}${month}`;

  const lastOrder = await prisma.tailoringOrder.findFirst({
    where: {
      userId,
      orderId: {
        startsWith: prefix,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  let sequence = 1;
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderId.slice(-4));
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const { status, customerId, startDate, endDate, dueStartDate, dueEndDate, active, overdue, sortBy, sortOrder } = req.query;

    const where: any = {
      userId: req.user?.ownerId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    } else if (active === 'true') {
      where.status = {
        notIn: ['DELIVERED', 'CANCELLED']
      };
    }

    if (customerId) where.customerId = customerId;

    if (overdue === 'true') {
      where.dueDate = {
        lt: new Date()
      };
      if (!status && !active) {
        where.status = {
          notIn: ['DELIVERED', 'CANCELLED']
        };
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    if ((dueStartDate || dueEndDate) && !overdue) {
      where.dueDate = {};
      if (dueStartDate) where.dueDate.gte = new Date(dueStartDate as string);
      if (dueEndDate) {
        const end = new Date(dueEndDate as string);
        end.setHours(23, 59, 59, 999);
        where.dueDate.lte = end;
      }
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

        // Dynamic Sort Object
        const orderByField = 
            (sortBy === 'dueDate') ? 'dueDate' : 'createdAt';
        const orderByDirection = 
            (sortOrder === 'asc') ? 'asc' : 'desc';

        const [orders, total] = await prisma.$transaction([
            prisma.tailoringOrder.findMany({
                where,
                include: {
                    customer: true,
                    orderItems: {
                        include: { product: true },
                    },
                    _count: {
                        select: {
                            payments: true,
                            measurements: true,
                            attachments: true,
                        },
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
                    },
                    attender: true,
                },
                orderBy: { [orderByField]: orderByDirection },
                skip,
                take: limit,
            }),
            prisma.tailoringOrder.count({ where }),
        ]);

    res.json({
      data: orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get orders error details:', error);
    res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const order = await prisma.tailoringOrder.findFirst({
      where: {
        id,
        userId: req.user!.ownerId
      },
      include: {
        customer: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
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
        orderAddOns: {
          include: { addOn: true },
        },
        payments: true,
        measurements: true,
        attachments: true,
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
        },
        attender: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const {
      customerId,
      deliveryOption,
      dueDate,
      items,
      addOns,
      materials,
      deliveryCharges,
      gstAmount,
      discount,
      advancePaid,
      notes,
      voiceNoteUrl,
      attachmentUrls,
      measurementId,
      orderingFor,
      sketchDataUrl,
      attenderId,
    } = req.body;

    if (!customerId || !dueDate || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // --- HARDEN MULTI-TENANCY: Verify customer belongs to this user ---
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: req.user!.ownerId, deletedAt: null }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found or access denied' });
    }
    // -----------------------------------------------------------------


    const productTotal = items.reduce(
      (sum: number, item: any) => sum + item.rate * item.quantity,
      0
    );

    const addOnsTotal = addOns
      ? addOns.reduce(
        (sum: number, addOn: any) => sum + addOn.rate * addOn.quantity,
        0
      )
      : 0;

    const itemTotal = productTotal + addOnsTotal;

    const grandTotal =
      itemTotal +
      (deliveryCharges || 0) +
      (gstAmount || 0) -
      (discount || 0);

    const balanceDue = grandTotal - (advancePaid || 0);

    const orderId = await generateOrderId(req.user!.ownerId);

    const order = await prisma.tailoringOrder.create({
      data: {
        orderId,
        customerId,
        userId: req.user!.ownerId,
        deliveryOption: deliveryOption || 'CUSTOM',
        dueDate: new Date(dueDate),
        productTotal,
        addOnsTotal,
        itemTotal,
        deliveryCharges: deliveryCharges || 0,
        gstAmount: gstAmount || 0,
        discount: discount || 0,
        grandTotal,
        advancePaid: advancePaid || 0,
        balanceDue,
        notes: notes ? sanitizeObject(notes) : null,
        voiceNoteUrl: voiceNoteUrl || null,
        sketchDataUrl: sketchDataUrl || null,
        orderingFor: orderingFor ? sanitizeObject(orderingFor) : null,
        attenderId: attenderId || null,
        orderItems: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            rate: item.rate,
            total: item.rate * item.quantity,
          })),
        },
        ...(addOns && addOns.length > 0
          ? {
            orderAddOns: {
              create: addOns.map((addOn: any) => ({
                addOnId: addOn.addOnId,
                quantity: addOn.quantity,
                price: addOn.rate,
                total: addOn.rate * addOn.quantity,
              })),
            },
          }
          : {}),
        ...(materials && materials.length > 0
          ? {
            orderMaterials: {
              create: materials.map((material: any) => ({
                itemId: material.itemId,
                quantity: material.quantity,
                price: material.rate,
                total: material.rate * material.quantity,
              })),
            },
          }
          : {}),
        ...(attachmentUrls && attachmentUrls.length > 0
          ? {
            attachments: {
              create: attachmentUrls.map((att: any) => ({
                fileUrl: att.url,
                fileType: att.fileType,
                fileName: att.originalName,
                fileSize: att.fileSize || 0,
              })),
            },
          }
          : {}),
      },
      include: {
        customer: true,
        orderItems: {
          include: { product: true },
        },
        orderAddOns: {
          include: { addOn: true },
        },
        attachments: true,
        attender: true,
      },
    });

    // 🔧 Link measurement to order AFTER order is created
    if (measurementId) {
      const measurement = await prisma.measurement.findFirst({
        where: {
          id: measurementId,
          customerId: customerId,
        },
      });

      if (measurement) {
        await prisma.measurement.update({
          where: { id: measurementId },
          data: { orderId: order.id },
        });
      }
    }

    await cacheDelByPrefix(`dash:stats:${req.user!.ownerId}`);
    await cacheDelByPrefix(`dash:activeOrders:${req.user!.ownerId}`);
    await cacheDelByPrefix(`dash:upcomingDeliveries:${req.user!.ownerId}`);
    await cacheDelByPrefix(`dash:overdueOrders:${req.user!.ownerId}`);

    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
};

export const updateOrder = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      customerId,
      deliveryOption,
      dueDate,
      status,
      items,
      addOns,
      materials,
      deliveryCharges,
      gstAmount,
      discount,
      advancePaid,
      notes,
      voiceNoteUrl,
      orderingFor,
      sketchDataUrl,
      attenderId,
    } = req.body;

    const existingOrder = await prisma.tailoringOrder.findFirst({
      where: {
        id,
        userId: req.user!.ownerId,
        deletedAt: null,
      },
    });

    if (!existingOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // --- HARDEN MULTI-TENANCY: Verify new customer belongs to this user if provided ---
    if (customerId && customerId !== existingOrder.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: customerId, userId: req.user!.ownerId, deletedAt: null }
      });
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found or access denied' });
      }
    }
    // ----------------------------------------------------------------------------------

    let updateData: any = {
      ...(customerId && { customerId }),
      ...(deliveryOption && { deliveryOption }),
      ...(dueDate && { dueDate: new Date(dueDate) }),
      ...(status && { status }),
      ...(notes !== undefined && { notes: sanitizeObject(notes) }),
      ...(voiceNoteUrl !== undefined && { voiceNoteUrl }),
      ...(sketchDataUrl !== undefined && { sketchDataUrl }),
      ...(orderingFor !== undefined && { orderingFor: orderingFor ? sanitizeObject(orderingFor) : null }),
      ...(attenderId !== undefined && { attenderId: attenderId || null }),
      ...(advancePaid !== undefined && { advancePaid }),
    };

    if (items && items.length > 0) {
      const productTotal = items.reduce(
        (sum: number, item: any) => sum + item.rate * item.quantity,
        0
      );

      const addOnsTotal = addOns
        ? addOns.reduce(
          (sum: number, addOn: any) => sum + addOn.rate * addOn.quantity,
          0
        )
        : 0;

      const itemTotal = productTotal + addOnsTotal;

      const grandTotal =
        itemTotal +
        (deliveryCharges || 0) +
        (gstAmount || 0) -
        (discount || 0);

      const balanceDue = grandTotal - (advancePaid || 0);

      updateData = {
        ...updateData,
        productTotal,
        addOnsTotal,
        itemTotal,
        deliveryCharges: deliveryCharges || 0,
        gstAmount: gstAmount || 0,
        discount: discount || 0,
        grandTotal,
        advancePaid: advancePaid || 0,
        balanceDue,
      };

      await prisma.orderItem.deleteMany({ where: { orderId: id } });
      updateData.orderItems = {
        create: items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          rate: item.rate,
          total: item.rate * item.quantity,
        })),
      };

      if (addOns) {
        await prisma.orderAddOn.deleteMany({ where: { orderId: id } });
        if (addOns.length > 0) {
          updateData.orderAddOns = {
            create: addOns.map((addOn: any) => ({
              addOnId: addOn.addOnId,
              quantity: addOn.quantity,
              price: addOn.rate,
              total: addOn.rate * addOn.quantity,
            })),
          };
        }
      }

      if (materials) {
        await prisma.orderMaterial.deleteMany({ where: { orderId: id } });
        if (materials.length > 0) {
          updateData.orderMaterials = {
            create: materials.map((material: any) => ({
              itemId: material.itemId,
              quantity: material.quantity,
              price: material.rate,
              total: material.rate * material.quantity,
            })),
          };
        }
      }
    }

    const updatedOrder = await prisma.tailoringOrder.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        orderItems: {
          include: { product: true },
        },
        orderAddOns: {
          include: { addOn: true },
        },
        orderMaterials: {
          include: { item: true },
        },
        payments: true,
        measurements: true,
        attachments: true,
        attender: true,
      },
    });

    await cacheDelByPrefix(`dash:*`);

    res.json(updatedOrder);
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ error: 'Failed to update order' });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const order = await prisma.tailoringOrder.findFirst({
      where: { id, userId: req.user!.ownerId, deletedAt: null },
      include: { customer: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updatedOrder = await prisma.tailoringOrder.update({
      where: { id },
      data: { status },
      include: { customer: true },
    });

    if (status === 'READY_TO_DELIVER' || status === 'DELIVERED') {
      const { customer } = order;

      const user = await prisma.user.findUnique({
        where: { id: req.user!.ownerId },
        select: { shopName: true }
      });

      const shopName = user?.shopName || 'KTown Aari Works Tailoring';

      if (customer.mobile) {
        await whatsappService.sendOrderStatusUpdate(
          customer.mobile,
          customer.name,
          order.orderId,
          status,
          Number(order.balanceDue)
        );
      }

      if (customer.email) {
        await emailService.sendOrderStatusEmail(
          customer.email,
          customer.name,
          order.orderId,
          status,
          Number(order.balanceDue),
          shopName
        );
      }
    }

    await cacheDelByPrefix(`dash:*`);

    res.json(updatedOrder);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

export const deleteOrder = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const order = await prisma.tailoringOrder.findFirst({
      where: { id, userId: req.user!.ownerId, deletedAt: null }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await prisma.tailoringOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await cacheDelByPrefix(`dash:stats:${req.user!.ownerId}`);
    await cacheDelByPrefix(`dash:activeOrders:${req.user!.ownerId}`);
    await cacheDelByPrefix(`dash:upcomingDeliveries:${req.user!.ownerId}`);
    await cacheDelByPrefix(`dash:overdueOrders:${req.user!.ownerId}`);

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
};

export const getPendingOrders = async (req: AuthRequest, res: Response) => {
  try {
    const orders = await prisma.tailoringOrder.findMany({
      where: {
        userId: req.user!.ownerId,
        deletedAt: null,
        status: {
          not: 'DELIVERED',
        },
        balanceDue: {
          gt: 0,
        },
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            mobile: true,
          },
        },
        _count: {
          select: {
            payments: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json(orders);
  } catch (error) {
    console.error('Get pending orders error:', error);
    res.status(500).json({ error: 'Failed to fetch pending orders' });
  }
};

export const getUpcomingDeliveries = async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const orders = await prisma.tailoringOrder.findMany({
      where: {
        userId: req.user!.ownerId,
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
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json(orders);
  } catch (error) {
    console.error('Get upcoming deliveries error:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming deliveries' });
  }
};

export const getOverdueOrders = async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();

    const orders = await prisma.tailoringOrder.findMany({
      where: {
        userId: req.user!.ownerId,
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
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    res.json(orders);
  } catch (error) {
    console.error('Get overdue orders error:', error);
    res.status(500).json({ error: 'Failed to fetch overdue orders' });
  }
}

export const lookupOrderByOrderId = async (req: AuthRequest, res: Response) => {
  try {
    const orderId = req.params.orderId as string;
    const order = await prisma.tailoringOrder.findFirst({
      where: {
        orderId,
        userId: req.user!.ownerId,
        deletedAt: null,
      },
      select: {
        id: true
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Lookup order error:', error);
    res.status(500).json({ error: 'Failed to lookup order' });
  }
};

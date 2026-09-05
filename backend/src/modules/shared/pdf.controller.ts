import { Response } from 'express';
import prisma from '../../lib/prisma';
import { AuthRequest } from './middleware/auth.middleware';
import { generateInvoicePDF, generateBarcodeLabelPDF } from './services/pdf.service';
import { MeasurementType } from '@prisma/client';

export const downloadInvoice = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    console.log('[PDF] Starting invoice generation for order:', id);

    const order = await prisma.tailoringOrder.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            measurement: true,
          },
        },
        orderItems: {
          include: {
            product: {
              include: {
                category: true
              }
            },
          },
        },
        measurements: true,
        user: {
          select: {
            shopName: true,
            email: true,
            phoneNumber: true,
            logoUrl: true,
            signatureUrl: true,
            invoiceSettings: true,
          }
        }
      },
    });

    if (!order || order.userId !== req.user!.ownerId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Determine which measurement types are relevant for this order
    const linkedMeasurements = (order as any).measurements || [];
    const relevantTypes = new Set<MeasurementType>();

    // Add types from directly linked measurements
    linkedMeasurements.forEach((m: any) => {
      if (m.type) relevantTypes.add(m.type);
    });

    // Add types from products in the order
    order.orderItems.forEach((item: any) => {
      const mType = item.product?.category?.measurementType;
      if (mType) relevantTypes.add(mType);
    });

    const finalMeasurements = [...linkedMeasurements];

    // For any relevant type that isn't directly linked, fetch the latest from the customer's profile
    for (const type of Array.from(relevantTypes)) {
      if (!linkedMeasurements.some((m: any) => m.type === type)) {
        const latestProfileMeasurement = await prisma.measurement.findFirst({
          where: {
            customerId: order.customerId,
            type: type,
            // Could strictly be orderId: null, but any past measurement works as fallback
          },
          orderBy: { updatedAt: 'desc' }
        });

        if (latestProfileMeasurement) {
          finalMeasurements.push(latestProfileMeasurement);
        }
      }
    }

    const orderForPDF = {
      ...order,
      measurements: finalMeasurements,
    };

    const pdfBuffer = await generateInvoicePDF(orderForPDF);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[PDF] Download invoice error:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
};

export const downloadBarcodeLabel = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    console.log('[PDF] Starting barcode label generation for order:', id);

    const order = await prisma.tailoringOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        orderItems: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            shopName: true,
          }
        }
      },
    });

    if (!order || order.userId !== req.user!.ownerId) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const pdfBuffer = await generateBarcodeLabelPDF(order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=barcode-${order.orderId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('[PDF] Download barcode error:', error);
    res.status(500).json({ error: 'Failed to generate barcode label' });
  }
};

import { Response } from 'express';
import prisma from '../../../lib/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';
import { storageService } from '../../shared/services/storage.service';

/**
 * Upload attachments for an existing order
 * POST /api/orders/:id/attachments
 */
export const uploadOrderAttachments = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const id = req.params.id as string;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    // Verify order exists and belongs to user
    const order = await prisma.tailoringOrder.findFirst({
      where: {
        id,
        userId: req.user!.ownerId
      }
    });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Upload each file
    const uploadResults = await Promise.all(
      files.map(async (file) => {
        const result = await storageService.uploadAttachment(file);
        return { file, result };
      })
    );

    // Check for any failed uploads
    const failed = uploadResults.filter((r) => !r.result.success);
    if (failed.length > 0) {
      return res.status(500).json({
        error: `${failed.length} file(s) failed to upload`,
      });
    }

    // Save all to database
    const attachments = await Promise.all(
      uploadResults.map(({ file, result }) =>
        prisma.orderAttachment.create({
          data: {
            orderId: id,
            fileUrl: result.url!,
            fileType: file.mimetype,
            fileName: file.originalname,
            fileSize: file.size,
          },
        })
      )
    );

    res.status(201).json({
      message: `${attachments.length} attachment(s) uploaded successfully`,
      attachments,
    });
  } catch (error) {
    console.error('Upload attachments error:', error);
    res.status(500).json({ error: 'Failed to upload attachments' });
  }
};

/**
 * Get all attachments for an order
 * GET /api/orders/:id/attachments
 */
export const getOrderAttachments = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const id = req.params.id as string;

    const attachments = await prisma.orderAttachment.findMany({
      where: {
        orderId: id,
        order: { userId: req.user!.ownerId }
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(attachments);
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
};

/**
 * Delete a single attachment
 * DELETE /api/orders/attachments/:attachmentId
 */
export const deleteOrderAttachment = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const attachmentId = req.params.attachmentId as string;



    const attachment = await prisma.orderAttachment.findFirst({
      where: {
        id: attachmentId,
        order: { userId: req.user!.ownerId }
      },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Delete from storage
    await storageService.deleteFile(attachment.fileUrl);

    // Delete from database
    await prisma.orderAttachment.delete({
      where: { id: attachmentId },
    });

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
};

/**
 * Upload attachments during order creation (before order ID exists)
 * POST /api/attachments/upload-temp
 * Returns URLs to be stored after order is created
 */
export const uploadTempAttachments = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const files = req.files as Express.Multer.File[];
    console.log('DEBUG UPLOAD-TEMP: req.files = ', files);

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    // Upload all files
    const results = await Promise.all(
      files.map(async (file) => {
        const result = await storageService.uploadAttachment(file);
        return {
          originalName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          url: result.url,
          success: result.success,
        };
      })
    );

    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      return res.status(500).json({
        error: `${failed.length} file(s) failed to upload`,
      });
    }

    res.status(200).json({
      message: 'Files uploaded successfully',
      files: results,
    });
  } catch (error) {
    console.error('Temp upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
};
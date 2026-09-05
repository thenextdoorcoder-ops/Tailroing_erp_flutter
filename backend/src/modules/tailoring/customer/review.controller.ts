import { Response } from 'express';
import prisma from '../../../lib/prisma';
import { AuthRequest } from '../../shared/middleware/auth.middleware';

export const getReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { customerId } = req.query;

    const where: any = {
      customer: { userId: req.user!.ownerId }
    };

    if (customerId) {
      where.customerId = customerId as string;
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            mobile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

export const getReviewById = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    const review = await prisma.review.findFirst({
      where: {
        id,
        customer: { userId: req.user!.ownerId }
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
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
};

export const createReview = async (req: AuthRequest, res: Response) => {
  try {
    const {
      customerId,
      rating,
      feedback,
    } = req.body;

    if (!customerId || !rating) {
      return res.status(400).json({ error: 'Customer and rating are required' });
    }

    // Verify customer ownership
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, userId: req.user!.ownerId }
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const review = await prisma.review.create({
      data: {
        customerId,
        rating,
        feedback,
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
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
};

export const updateReview = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const {
      rating,
      feedback,
    } = req.body;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Verify ownership
    const existingReview = await prisma.review.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!existingReview || existingReview.customer.userId !== req.user!.ownerId) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const review = await prisma.review.update({
      where: { id },
      data: {
        rating,
        feedback,
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
    });

    res.json(review);
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
};

export const deleteReview = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Verify ownership
    const review = await prisma.review.findUnique({
      where: { id },
      include: { customer: true }
    });

    if (!review || review.customer.userId !== req.user!.ownerId) {
      return res.status(404).json({ error: 'Review not found' });
    }

    await prisma.review.delete({
      where: { id },
    });

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
};

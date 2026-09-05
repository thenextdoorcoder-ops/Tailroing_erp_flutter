import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { config } from '../../../config/env';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(400).json({
        error: 'A record with this unique field already exists',
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Record not found',
      });
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      error: 'Validation error',
      details: config.env === 'development' ? err.message : undefined,
    });
  }

  // Multer errors
  if ((err as any).code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large. Max size allowed is 1MB (after compression).',
    });
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: `Upload error: ${err.message}`,
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    message: config.env === 'development' ? err.message : undefined,
  });
};

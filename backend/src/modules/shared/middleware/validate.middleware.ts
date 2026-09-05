/**
 * validate.middleware.ts
 * Reusable Zod validation middleware for Express routes.
 * Validates req.body against a provided Zod schema and returns a
 * consistent 400 error response if validation fails.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';
import { ParsedQs } from 'qs';

/**
 * Creates an Express middleware that validates `req.body` against a Zod schema.
 * On success, it replaces req.body with the parsed (coerced) data from Zod.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    req.body = result.data;
    next();
  };
}

/**
 * Creates an Express middleware that validates `req.query` against a Zod schema.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    req.query = result.data as ParsedQs;
    next();
  };
}

function formatZodErrors(error: ZodError): Record<string, string> {
  return error.issues.reduce(
    (acc: Record<string, string>, e: ZodIssue) => {
      const field = e.path.join('.') || 'body';
      acc[field] = e.message;
      return acc;
    },
    {}
  );
}

import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Express middleware factory that validates request data against a Zod schema.
 * Attaches parsed data back to the request for type-safe access downstream.
 */
export const validate = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(result.error);
      return;
    }
    req[target] = result.data;
    next();
  };
};

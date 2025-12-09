import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from './errorHandler';

/**
 * Middleware to validate that the :id parameter is a valid MongoDB ObjectId
 */
export const validateObjectId = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError(`Invalid ID format: ${id}`, 400));
  }

  next();
};

/**
 * Factory function to validate ObjectId for a specific parameter name
 */
export const validateObjectIdParam = (paramName: string) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const id = req.params[paramName];

    if (!id) {
      return next(new AppError(`Missing parameter: ${paramName}`, 400));
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError(`Invalid ${paramName} format: ${id}`, 400));
    }

    next();
  };
};

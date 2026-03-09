import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware';
import { categoryService } from './category.service';

export const getCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const categories = await categoryService.getCategories(user.id);
    res.status(200).json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const category = await categoryService.createCategory(user.id, req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const category = await categoryService.updateCategory(String(req.params.id), user.id, req.body);
    res.status(200).json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    await categoryService.deleteCategory(String(req.params.id), user.id);
    res.status(200).json({
      success: true,
      data: { message: 'Category deleted successfully' },
    });
  } catch (err) {
    next(err);
  }
};

import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware';
import { budgetService } from './budget.service';

export const createBudget = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const budget = await budgetService.createBudget(user.id, req.body);
    res.status(201).json({ success: true, data: budget });
  } catch (err) {
    next(err);
  }
};

export const getBudgets = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const budgets = await budgetService.getBudgets(user.id);
    res.status(200).json({ success: true, data: budgets });
  } catch (err) {
    next(err);
  }
};

export const getBudgetById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const budget = await budgetService.getBudgetById(String(req.params.id), user.id);
    res.status(200).json({ success: true, data: budget });
  } catch (err) {
    next(err);
  }
};

export const updateBudget = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const budget = await budgetService.updateBudget(String(req.params.id), user.id, req.body);
    res.status(200).json({ success: true, data: budget });
  } catch (err) {
    next(err);
  }
};

export const deleteBudget = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    await budgetService.deleteBudget(String(req.params.id), user.id);
    res.status(200).json({
      success: true,
      data: { message: 'Budget deleted successfully' },
    });
  } catch (err) {
    next(err);
  }
};

export const checkBudgetAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const alerts = await budgetService.checkBudgetAlerts(user.id);
    res.status(200).json({ success: true, data: alerts });
  } catch (err) {
    next(err);
  }
};

import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware';
import { expenseService } from './expense.service';

export const createExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const expense = await expenseService.createExpense(user.id, req.body);
    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
};

export const getExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const expense = await expenseService.getExpenseById(String(req.params.id), user.id);
    res.status(200).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
};

export const getGroupExpenses = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const result = await expenseService.getGroupExpenses(
      String(req.params.groupId),
      user.id,
      req.query as never,
    );
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const updateExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const expense = await expenseService.updateExpense(String(req.params.id), user.id, req.body);
    res.status(200).json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
};

export const deleteExpense = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    await expenseService.deleteExpense(String(req.params.id), user.id);
    res.status(200).json({
      success: true,
      data: { message: 'Expense deleted successfully' },
    });
  } catch (err) {
    next(err);
  }
};

export const getGroupBalances = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const balances = await expenseService.getGroupBalances(
      String(req.params.groupId),
      user.id,
    );
    res.status(200).json({ success: true, data: balances });
  } catch (err) {
    next(err);
  }
};

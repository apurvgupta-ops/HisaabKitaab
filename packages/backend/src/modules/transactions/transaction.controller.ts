import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware';
import { transactionService } from './transaction.service';

export const createTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const txn = await transactionService.createTransaction(user.id, req.body);
    res.status(201).json({ success: true, data: txn });
  } catch (err) {
    next(err);
  }
};

export const getTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const result = await transactionService.getTransactions(user.id, req.query as never);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getTransactionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const txn = await transactionService.getTransactionById(String(req.params.id), user.id);
    res.status(200).json({ success: true, data: txn });
  } catch (err) {
    next(err);
  }
};

export const updateTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const txn = await transactionService.updateTransaction(String(req.params.id), user.id, req.body);
    res.status(200).json({ success: true, data: txn });
  } catch (err) {
    next(err);
  }
};

export const deleteTransaction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    await transactionService.deleteTransaction(String(req.params.id), user.id);
    res.status(200).json({
      success: true,
      data: { message: 'Transaction deleted successfully' },
    });
  } catch (err) {
    next(err);
  }
};

export const getSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const summary = await transactionService.getSummary(user.id, startDate, endDate);
    res.status(200).json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
};

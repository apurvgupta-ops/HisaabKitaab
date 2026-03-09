import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware';
import { reportService } from './report.service';

export const exportGroupCSV = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { groupId } = req.params;
    const filters = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      categoryId: req.query.categoryId as string | undefined,
    };

    const csv = await reportService.exportExpensesToCSV(String(groupId), user.id, filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${groupId}.csv"`);
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
};

export const exportTransactionsCSV = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const filters = {
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      categoryId: req.query.categoryId as string | undefined,
    };

    const csv = await reportService.exportTransactionsToCSV(user.id, filters);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
};

export const getExpenseReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { groupId } = req.params;

    const report = await reportService.generateExpenseReport(String(groupId), user.id);

    res.status(200).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

export const getFinancialReport = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'startDate and endDate query parameters are required',
        },
      });
      return;
    }

    const report = await reportService.generateFinancialReport(
      user.id,
      startDate,
      endDate,
    );

    res.status(200).json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
};

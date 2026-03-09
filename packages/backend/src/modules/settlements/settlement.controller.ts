import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware';
import { settlementService } from './settlement.service';

export const createSettlement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const settlement = await settlementService.createSettlement(user.id, req.body);
    res.status(201).json({ success: true, data: settlement });
  } catch (err) {
    next(err);
  }
};

export const getGroupSettlements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const settlements = await settlementService.getGroupSettlements(
      String(req.params.groupId),
      user.id,
    );
    res.status(200).json({ success: true, data: settlements });
  } catch (err) {
    next(err);
  }
};

export const getUserSettlements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const settlements = await settlementService.getUserSettlements(user.id);
    res.status(200).json({ success: true, data: settlements });
  } catch (err) {
    next(err);
  }
};

export const updateSettlementStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const settlement = await settlementService.updateSettlementStatus(
      String(req.params.id),
      user.id,
      req.body,
    );
    res.status(200).json({ success: true, data: settlement });
  } catch (err) {
    next(err);
  }
};

export const getSimplifiedDebts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const debts = await settlementService.getSimplifiedDebts(
      String(req.params.groupId),
      user.id,
    );
    res.status(200).json({ success: true, data: debts });
  } catch (err) {
    next(err);
  }
};

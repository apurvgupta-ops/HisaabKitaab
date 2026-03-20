import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../../middleware';
import { aiService } from './ai.service';

export const categorizeExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { description, amount, currency } = req.body as {
      description: string;
      amount: number;
      currency: string;
    };

    const result = await aiService.categorizeExpense(description, amount, currency ?? 'USD');

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const parseNaturalLanguageExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { text } = req.body as { text: string };
    const result = await aiService.parseNaturalLanguageExpense(text);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const getFinancialInsights = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const insights = await aiService.generateFinancialInsights(user.id);
    res.status(200).json({ success: true, data: insights });
  } catch (err) {
    next(err);
  }
};

export const chatWithAssistant = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { message, history } = req.body as {
      message: string;
      history?: { role: string; content: string }[];
    };

    if (!message?.trim()) {
      res.status(400).json({ success: false, error: { message: 'Message is required' } });
      return;
    }

    const result = await aiService.chat(user.id, message, history ?? []);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

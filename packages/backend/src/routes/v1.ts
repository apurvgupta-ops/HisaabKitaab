import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import userRoutes from '../modules/users/user.routes';
import groupRoutes from '../modules/groups/group.routes';
import expenseRoutes from '../modules/expenses/expense.routes';
import settlementRoutes from '../modules/settlements/settlement.routes';
import transactionRoutes from '../modules/transactions/transaction.routes';
import budgetRoutes from '../modules/budgets/budget.routes';
import categoryRoutes from '../modules/categories/category.routes';
import aiRoutes from '../modules/ai/ai.routes';
import uploadRoutes from '../modules/uploads/upload.routes';
import reportRoutes from '../modules/reports/report.routes';
import featureRoutes from '../modules/features/feature.routes';
import reminderRoutes from '../modules/reminders/reminder.routes';
import recurringRoutes from '../modules/recurring/recurring.routes';

/**
 * API v1 router. All REST endpoints are versioned under /api/v1.
 * Enables safe backwards-compatible changes and clear deprecation path.
 */
const v1Router = Router();

v1Router.use('/auth', authRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/groups', groupRoutes);
v1Router.use('/expenses', expenseRoutes);
v1Router.use('/settlements', settlementRoutes);
v1Router.use('/transactions', transactionRoutes);
v1Router.use('/budgets', budgetRoutes);
v1Router.use('/categories', categoryRoutes);
v1Router.use('/ai', aiRoutes);
v1Router.use('/uploads', uploadRoutes);
v1Router.use('/reports', reportRoutes);
v1Router.use('/features', featureRoutes);
v1Router.use('/reminders', reminderRoutes);
v1Router.use('/recurring', recurringRoutes);

export default v1Router;

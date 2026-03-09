import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { env } from "./config";
import { errorHandler, apiLimiter } from "./middleware";
import { logger } from "./shared/logger";

import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/user.routes";
import groupRoutes from "./modules/groups/group.routes";
import expenseRoutes from "./modules/expenses/expense.routes";
import settlementRoutes from "./modules/settlements/settlement.routes";
import transactionRoutes from "./modules/transactions/transaction.routes";
import budgetRoutes from "./modules/budgets/budget.routes";
import categoryRoutes from "./modules/categories/category.routes";
import aiRoutes from "./modules/ai/ai.routes";
import uploadRoutes from "./modules/uploads/upload.routes";
import reportRoutes from "./modules/reports/report.routes";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, "Incoming request");
  next();
});

app.use("/api", apiLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/settlements", settlementRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/reports", reportRoutes);

app.use(errorHandler);

export default app;

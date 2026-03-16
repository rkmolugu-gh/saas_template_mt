import "reflect-metadata";
import express from "express";
import cors from "cors";
import * as dotenv from "dotenv";
import { AppDataSource } from "./data-source";

// Route imports
import { authRoutes } from "./routes/auth.routes";
import { tenantRoutes } from "./routes/tenants.routes";
import { memberRoutes } from "./routes/members.routes";
import { itemRoutes } from "./routes/items.routes";
import { fileRoutes } from "./routes/files.routes";
import { planRoutes } from "./routes/plans.routes";
import { notificationRoutes } from "./routes/notifications.routes";
import { auditRoutes } from "./routes/audit.routes";
import { adminRoutes } from "./routes/admin.routes";
import { errorHandler } from "./utils/errors";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// Global middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Route groups
app.use("/api/auth", authRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/admin", adminRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Start
AppDataSource.initialize()
  .then(() => {
    console.log("Database connected");
    app.listen(PORT, () => {
      console.log(`Middleware API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to database:", err);
    process.exit(1);
  });

export default app;

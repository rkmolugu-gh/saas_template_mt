import { Router, Response } from "express";
import { IsNull } from "typeorm";
import { AppDataSource } from "../data-source";
import { Notification } from "../../../backend/src/entities/Notification";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { tenantScope, TenantScopedRequest } from "../middleware/tenantScope";

const router = Router();

// --- GET /api/notifications — list user's notifications ---
router.get("/", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const { limit = "50" } = req.query;

    const notifications = await AppDataSource.getRepository(Notification).find({
      where: { tenant_id: req.tenantId, user_id: req.user!.id },
      order: { created_at: "DESC" },
      take: parseInt(limit as string, 10),
    });

    res.json(notifications);
  } catch (err) {
    console.error("List notifications error:", err);
    res.status(500).json({ error: "Failed to list notifications" });
  }
});

// --- GET /api/notifications/unread-count — count unread notifications ---
router.get("/unread-count", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const count = await AppDataSource.getRepository(Notification).count({
      where: { tenant_id: req.tenantId, user_id: req.user!.id, read_at: IsNull() },
    });

    res.json({ count });
  } catch (err) {
    console.error("Count notifications error:", err);
    res.status(500).json({ error: "Failed to count notifications" });
  }
});

// --- PUT /api/notifications/:id/read — mark notification as read ---
router.put("/:id/read", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const notificationId = req.params.id as string;
    const repo = AppDataSource.getRepository(Notification);
    const notification = await repo.findOne({
      where: { id: notificationId, user_id: req.user!.id },
    });

    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    notification.read_at = new Date();
    await repo.save(notification);

    res.json(notification);
  } catch (err) {
    console.error("Mark notification error:", err);
    res.status(500).json({ error: "Failed to mark notification" });
  }
});

// --- PUT /api/notifications/read-all — mark all as read ---
router.put("/read-all", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    await AppDataSource.getRepository(Notification)
      .createQueryBuilder()
      .update()
      .set({ read_at: new Date() })
      .where("tenant_id = :tenantId AND user_id = :userId AND read_at IS NULL", {
        tenantId: req.tenantId,
        userId: req.user!.id,
      })
      .execute();

    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Mark all read error:", err);
    res.status(500).json({ error: "Failed to mark all read" });
  }
});

export { router as notificationRoutes };

import { Router, Response } from "express";
import { AppDataSource } from "../data-source";
import { Notification } from "../../../backend/src/entities/Notification";
import { authenticate } from "../middleware/auth";
import { tenantScope, TenantScopedRequest } from "../middleware/tenantScope";

const router = Router();

// GET /api/notifications — list user's notifications
router.get("/", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const notifications = await AppDataSource.getRepository(Notification).find({
      where: { tenant_id: req.tenantId, user_id: req.user!.id },
      order: { created_at: "DESC" },
      take: 50,
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: "Failed to list notifications" });
  }
});

// GET /api/notifications/unread-count — count unread notifications
router.get("/unread-count", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const count = await AppDataSource.getRepository(Notification).count({
      where: { tenant_id: req.tenantId, user_id: req.user!.id, read_at: undefined },
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Failed to count notifications" });
  }
});

// PUT /api/notifications/:id/read — mark notification as read
router.put("/:id/read", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Notification);
    const notification = await repo.findOneBy({ id: req.params.id, user_id: req.user!.id });
    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    notification.read_at = new Date();
    await repo.save(notification);
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: "Failed to mark notification" });
  }
});

// PUT /api/notifications/read-all — mark all as read
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
    res.status(500).json({ error: "Failed to mark all read" });
  }
});

export { router as notificationRoutes };

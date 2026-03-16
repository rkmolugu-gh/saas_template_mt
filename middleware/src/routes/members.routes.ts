import { Router, Response } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { AppDataSource } from "../data-source";
import { TenantMembership, MemberRole } from "../../../backend/src/entities/TenantMembership";
import { Invitation } from "../../../backend/src/entities/Invitation";
import { User } from "../../../backend/src/entities/User";
import { authenticate } from "../middleware/auth";
import { tenantScope, TenantScopedRequest } from "../middleware/tenantScope";
import { requireRole } from "../middleware/requireRole";
import { validate } from "../utils/validate";

const router = Router();

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]),
});

const updateRoleSchema = z.object({
  role: z.enum(["owner", "admin", "member", "viewer"]),
});

// GET /api/members — list members for current tenant
router.get("/", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const members = await AppDataSource.getRepository(TenantMembership).find({
      where: { tenant_id: req.tenantId },
      relations: ["user"],
    });
    res.json(
      members.map((m) => ({
        id: m.id,
        user_id: m.user_id,
        email: m.user.email,
        full_name: m.user.full_name,
        avatar_url: m.user.avatar_url,
        role: m.role,
        joined_at: m.joined_at,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to list members" });
  }
});

// POST /api/members/invite — send invitation
router.post(
  "/invite",
  authenticate,
  tenantScope,
  requireRole(MemberRole.OWNER, MemberRole.ADMIN),
  validate(inviteSchema),
  async (req: TenantScopedRequest, res: Response) => {
    try {
      const { email, role } = req.body;
      const invRepo = AppDataSource.getRepository(Invitation);

      const token = uuidv4();
      const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = await invRepo.save(
        invRepo.create({
          tenant_id: req.tenantId,
          email,
          role: role as MemberRole,
          token,
          expires_at,
        })
      );

      res.status(201).json({ invitation, invite_link: `/invite/${token}` });
    } catch (err) {
      res.status(500).json({ error: "Failed to send invitation" });
    }
  }
);

// POST /api/members/accept-invite/:token — accept invitation
router.post("/accept-invite/:token", authenticate, async (req: TenantScopedRequest, res: Response) => {
  try {
    const invRepo = AppDataSource.getRepository(Invitation);
    const memberRepo = AppDataSource.getRepository(TenantMembership);

    const invitation = await invRepo.findOneBy({ token: req.params.token });
    if (!invitation) {
      res.status(404).json({ error: "Invitation not found" });
      return;
    }
    if (invitation.accepted_at) {
      res.status(400).json({ error: "Invitation already accepted" });
      return;
    }
    if (new Date() > invitation.expires_at) {
      res.status(400).json({ error: "Invitation expired" });
      return;
    }

    // Create membership
    await memberRepo.save(
      memberRepo.create({
        tenant_id: invitation.tenant_id,
        user_id: req.user!.id,
        role: invitation.role,
      })
    );

    invitation.accepted_at = new Date();
    await invRepo.save(invitation);

    res.json({ message: "Invitation accepted", tenant_id: invitation.tenant_id });
  } catch (err) {
    res.status(500).json({ error: "Failed to accept invitation" });
  }
});

// PUT /api/members/:id/role — change member role
router.put(
  "/:id/role",
  authenticate,
  tenantScope,
  requireRole(MemberRole.OWNER, MemberRole.ADMIN),
  validate(updateRoleSchema),
  async (req: TenantScopedRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(TenantMembership);
      const member = await repo.findOneBy({ id: req.params.id, tenant_id: req.tenantId });
      if (!member) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      member.role = req.body.role as MemberRole;
      await repo.save(member);
      res.json(member);
    } catch (err) {
      res.status(500).json({ error: "Failed to update role" });
    }
  }
);

// DELETE /api/members/:id — remove member
router.delete(
  "/:id",
  authenticate,
  tenantScope,
  requireRole(MemberRole.OWNER, MemberRole.ADMIN),
  async (req: TenantScopedRequest, res: Response) => {
    try {
      const repo = AppDataSource.getRepository(TenantMembership);
      const result = await repo.delete({ id: req.params.id, tenant_id: req.tenantId });
      if (result.affected === 0) {
        res.status(404).json({ error: "Member not found" });
        return;
      }
      res.json({ message: "Member removed" });
    } catch (err) {
      res.status(500).json({ error: "Failed to remove member" });
    }
  }
);

export { router as memberRoutes };

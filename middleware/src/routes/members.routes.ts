import { Router, Response } from "express";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { AppDataSource } from "../data-source";
import { TenantMembership, MemberRole } from "../../../backend/src/entities/TenantMembership";
import { Invitation } from "../../../backend/src/entities/Invitation";
import { User } from "../../../backend/src/entities/User";
import { Tenant, TenantStatus } from "../../../backend/src/entities/Tenant";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { optionalAuth } from "../middleware/auth";
import { tenantScope, TenantScopedRequest } from "../middleware/tenantScope";
import { requireRole } from "../middleware/requireRole";
import { validate } from "../utils/validate";
import { getParamOrFail } from "../utils/params";
import { IsNull, Not } from "typeorm";

const router = Router();

const inviteSchema = z.object({
  email: z.string().email("Invalid email format"),
  role: z.enum(["admin", "member", "viewer"], {
    errorMap: () => ({ message: "Role must be admin, member, or viewer" }),
  }),
});

const updateRoleSchema = z.object({
  role: z.enum(["owner", "admin", "member", "viewer"], {
    errorMap: () => ({ message: "Invalid role" }),
  }),
});

const acceptInviteSchema = z.object({
  full_name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
});

// --- GET /api/members — list members for current tenant ---
router.get("/", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const members = await AppDataSource.getRepository(TenantMembership)
      .createQueryBuilder("tm")
      .innerJoinAndSelect("tm.user", "user")
      .where("tm.tenant_id = :tenantId", { tenantId: req.tenantId })
      .orderBy("tm.joined_at", "ASC")
      .getMany();

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
    console.error("List members error:", err);
    res.status(500).json({ error: "Failed to list members" });
  }
});

// --- GET /api/members/invite/:token — public endpoint to view invite details ---
router.get("/invite/:token", optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = getParamOrFail(req, "token");
    const invRepo = AppDataSource.getRepository(Invitation);

    const invitation = await invRepo.findOne({
      where: { token },
      relations: ["tenant"],
    });

    if (!invitation) {
      res.status(404).json({ error: "Invitation not found" });
      return;
    }

    if (invitation.accepted_at) {
      res.status(400).json({ error: "Invitation already accepted" });
      return;
    }

    if (new Date() > invitation.expires_at) {
      res.status(400).json({ error: "Invitation has expired" });
      return;
    }

    // Check if invited email matches logged-in user
    const isLoggedIn = !!req.user;
    const emailMatches = req.user?.email === invitation.email;

    // Check if user with this email already exists
    const userRepo = AppDataSource.getRepository(User);
    const existingUser = await userRepo.findOneBy({ email: invitation.email });

    res.json({
      tenant: {
        id: invitation.tenant.id,
        name: invitation.tenant.name,
        slug: invitation.tenant.slug,
      },
      email: invitation.email,
      role: invitation.role,
      is_new_user: !existingUser,
      can_accept: isLoggedIn && emailMatches,
      needs_login: existingUser && !emailMatches,
    });
  } catch (err) {
    console.error("Get invite error:", err);
    res.status(500).json({ error: "Failed to get invitation" });
  }
});

// --- POST /api/members/invite — send invitation (admin/owner only) ---
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
      const memberRepo = AppDataSource.getRepository(TenantMembership);

      // Check if user is already a member
      const existingMember = await memberRepo
        .createQueryBuilder("tm")
        .innerJoin("tm.user", "user")
        .where("tm.tenant_id = :tenantId", { tenantId: req.tenantId })
        .andWhere("user.email = :email", { email })
        .getOne();

      if (existingMember) {
        res.status(400).json({ error: "User is already a member of this tenant" });
        return;
      }

      // Check for existing pending invitation
      const existingInvitation = await invRepo.findOne({
        where: {
          tenant_id: req.tenantId,
          email,
          accepted_at: IsNull(),
        },
      });

      if (existingInvitation && new Date() < existingInvitation.expires_at) {
        res.status(400).json({ error: "An invitation is already pending for this email" });
        return;
      }

      // Create invitation
      const token = uuidv4();
      const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = invRepo.create({
        tenant_id: req.tenantId,
        email,
        role: role as MemberRole,
        token,
        expires_at,
      });

      await invRepo.save(invitation);

      res.status(201).json({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expires_at: invitation.expires_at,
        invite_link: `/invite/${token}`,
      });
    } catch (err) {
      console.error("Create invite error:", err);
      res.status(500).json({ error: "Failed to create invitation" });
    }
  }
);

// --- POST /api/members/accept-invite/:token — accept invitation (authenticated) ---
router.post(
  "/accept-invite/:token",
  authenticate,
  validate(acceptInviteSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const token = getParamOrFail(req, "token");
      const invRepo = AppDataSource.getRepository(Invitation);
      const memberRepo = AppDataSource.getRepository(TenantMembership);

      const invitation = await invRepo.findOne({
        where: { token },
        relations: ["tenant"],
      });

      if (!invitation) {
        res.status(404).json({ error: "Invitation not found" });
        return;
      }

      if (invitation.accepted_at) {
        res.status(400).json({ error: "Invitation already accepted" });
        return;
      }

      if (new Date() > invitation.expires_at) {
        res.status(400).json({ error: "Invitation has expired" });
        return;
      }

      // Verify the logged-in user's email matches the invitation
      if (req.user!.email !== invitation.email) {
        res.status(403).json({
          error: "This invitation is for a different email address",
          invited_email: invitation.email,
        });
        return;
      }

      // Check if already a member
      const existingMembership = await memberRepo.findOne({
        where: { tenant_id: invitation.tenant_id, user_id: req.user!.id },
      });

      if (existingMembership) {
        // Mark invitation as accepted anyway
        invitation.accepted_at = new Date();
        await invRepo.save(invitation);
        res.status(400).json({ error: "You are already a member of this tenant" });
        return;
      }

      // Create membership
      const membership = memberRepo.create({
        tenant_id: invitation.tenant_id,
        user_id: req.user!.id,
        role: invitation.role,
      });
      await memberRepo.save(membership);

      // Mark invitation as accepted
      invitation.accepted_at = new Date();
      await invRepo.save(invitation);

      res.json({
        message: "Invitation accepted",
        tenant: {
          id: invitation.tenant.id,
          name: invitation.tenant.name,
          slug: invitation.tenant.slug,
        },
        role: invitation.role,
      });
    } catch (err) {
      console.error("Accept invite error:", err);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  }
);

// --- PUT /api/members/:id/role — change member role ---
router.put(
  "/:id/role",
  authenticate,
  tenantScope,
  requireRole(MemberRole.OWNER, MemberRole.ADMIN),
  validate(updateRoleSchema),
  async (req: TenantScopedRequest, res: Response) => {
    try {
      const memberId = getParamOrFail(req, "id");
      const newRole = req.body.role as MemberRole;

      const memberRepo = AppDataSource.getRepository(TenantMembership);
      const membership = await memberRepo.findOne({
        where: { id: memberId, tenant_id: req.tenantId },
        relations: ["user"],
      });

      if (!membership) {
        res.status(404).json({ error: "Member not found" });
        return;
      }

      // Prevent changing your own role
      if (membership.user_id === req.user!.id) {
        res.status(400).json({ error: "You cannot change your own role" });
        return;
      }

      // If demoting an owner, check if they're the last owner
      if (membership.role === MemberRole.OWNER && newRole !== MemberRole.OWNER) {
        const ownerCount = await memberRepo.count({
          where: { tenant_id: req.tenantId, role: MemberRole.OWNER },
        });

        if (ownerCount <= 1) {
          res.status(400).json({ error: "Cannot demote the last owner. Transfer ownership first." });
          return;
        }
      }

      // Admin cannot promote to owner or modify owners
      const requestingMember = await memberRepo.findOne({
        where: { tenant_id: req.tenantId, user_id: req.user!.id },
      });

      if (requestingMember?.role === MemberRole.ADMIN) {
        if (membership.role === MemberRole.OWNER || newRole === MemberRole.OWNER) {
          res.status(403).json({ error: "Admins cannot manage owner roles" });
          return;
        }
      }

      membership.role = newRole;
      await memberRepo.save(membership);

      res.json({
        id: membership.id,
        user_id: membership.user_id,
        email: membership.user.email,
        full_name: membership.user.full_name,
        role: membership.role,
      });
    } catch (err) {
      console.error("Update role error:", err);
      res.status(500).json({ error: "Failed to update role" });
    }
  }
);

// --- DELETE /api/members/:id — remove member ---
router.delete(
  "/:id",
  authenticate,
  tenantScope,
  requireRole(MemberRole.OWNER, MemberRole.ADMIN),
  async (req: TenantScopedRequest, res: Response) => {
    try {
      const memberId = getParamOrFail(req, "id");
      const memberRepo = AppDataSource.getRepository(TenantMembership);

      const membership = await memberRepo.findOne({
        where: { id: memberId, tenant_id: req.tenantId },
      });

      if (!membership) {
        res.status(404).json({ error: "Member not found" });
        return;
      }

      // Cannot remove yourself
      if (membership.user_id === req.user!.id) {
        res.status(400).json({ error: "You cannot remove yourself. Transfer ownership or leave the tenant." });
        return;
      }

      // Cannot remove the last owner
      if (membership.role === MemberRole.OWNER) {
        const ownerCount = await memberRepo.count({
          where: { tenant_id: req.tenantId, role: MemberRole.OWNER },
        });

        if (ownerCount <= 1) {
          res.status(400).json({ error: "Cannot remove the last owner" });
          return;
        }
      }

      // Admin cannot remove owners
      const requestingMember = await memberRepo.findOne({
        where: { tenant_id: req.tenantId, user_id: req.user!.id },
      });

      if (requestingMember?.role === MemberRole.ADMIN && membership.role === MemberRole.OWNER) {
        res.status(403).json({ error: "Admins cannot remove owners" });
        return;
      }

      await memberRepo.remove(membership);

      res.json({ message: "Member removed" });
    } catch (err) {
      console.error("Remove member error:", err);
      res.status(500).json({ error: "Failed to remove member" });
    }
  }
);

export { router as memberRoutes };

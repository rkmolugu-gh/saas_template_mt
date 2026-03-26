import { Router, Request, Response } from "express";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { z } from "zod";
import { AppDataSource } from "../data-source";
import { User } from "../../../backend/src/entities/User";
import { Tenant, TenantStatus } from "../../../backend/src/entities/Tenant";
import { TenantMembership, MemberRole } from "../../../backend/src/entities/TenantMembership";
import { validate } from "../utils/validate";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "change-me-to-a-random-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// --- Schemas ---
const signupSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().min(1, "Full name is required"),
  tenant_name: z.string().min(1, "Tenant name is required"),
  tenant_slug: z
    .string()
    .min(2, "Tenant slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Tenant slug can only contain lowercase letters, numbers, and hyphens"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const updateUserSchema = z.object({
  full_name: z.string().min(1).optional(),
  avatar_url: z.string().url().nullable().optional(),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(6, "New password must be at least 6 characters"),
});

// --- Helper: Generate JWT ---
function generateToken(user: User, isSuperAdmin = false): string {
  const payload = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    is_super_admin: isSuperAdmin,
  };
  const options: jwt.SignOptions = { expiresIn: "7d" };
  return jwt.sign(payload, JWT_SECRET, options);
}

// --- POST /api/auth/signup ---
router.post("/signup", validate(signupSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, full_name, tenant_name, tenant_slug } = req.body;

    const userRepo = AppDataSource.getRepository(User);
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const memberRepo = AppDataSource.getRepository(TenantMembership);

    // Check existing user
    const existingUser = await userRepo.findOneBy({ email });
    if (existingUser) {
      res.status(409).json({ error: "User with this email already exists" });
      return;
    }

    // Check existing tenant slug
    const existingTenant = await tenantRepo.findOneBy({ slug: tenant_slug });
    if (existingTenant) {
      res.status(409).json({ error: "Tenant slug already taken" });
      return;
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const user = userRepo.create({ email, full_name, password_hash });
    const savedUser = await userRepo.save(user);

    // Create tenant
    const tenant = tenantRepo.create({
      name: tenant_name,
      slug: tenant_slug,
      status: TenantStatus.ACTIVE,
      settings: {},
    });
    const savedTenant = await tenantRepo.save(tenant);

    // Create membership as owner
    const membership = memberRepo.create({
      tenant_id: savedTenant.id,
      user_id: savedUser.id,
      role: MemberRole.OWNER,
    });
    await memberRepo.save(membership);

    // Generate JWT
    const token = generateToken(savedUser);

    res.status(201).json({
      token,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        full_name: savedUser.full_name,
      },
      tenant: {
        id: savedTenant.id,
        name: savedTenant.name,
        slug: savedTenant.slug,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// --- POST /api/auth/login ---
router.post("/login", validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ email });

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Get user's tenants with membership info
    const memberRepo = AppDataSource.getRepository(TenantMembership);
    const memberships = await memberRepo
      .createQueryBuilder("tm")
      .innerJoinAndSelect("tm.tenant", "tenant")
      .where("tm.user_id = :userId", { userId: user.id })
      .andWhere("tenant.status != :deleted", { deleted: TenantStatus.DELETED })
      .getMany();

    // Check if user is super admin (has membership with super_admin role or special flag)
    // For now, we check if the user's email matches a super admin list from env
    const superAdminEmails = (process.env.SUPER_ADMIN_EMAILS || "").split(",").map((e) => e.trim());
    const isSuperAdmin = superAdminEmails.includes(user.email);

    const token = generateToken(user, isSuperAdmin);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        is_super_admin: isSuperAdmin,
      },
      tenants: memberships.map((m) => ({
        id: m.tenant.id,
        name: m.tenant.name,
        slug: m.tenant.slug,
        role: m.role,
      })),
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// --- GET /api/auth/me ---
router.get("/me", authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ id: req.user!.id });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Get user's tenants
    const memberRepo = AppDataSource.getRepository(TenantMembership);
    const memberships = await memberRepo
      .createQueryBuilder("tm")
      .innerJoinAndSelect("tm.tenant", "tenant")
      .where("tm.user_id = :userId", { userId: user.id })
      .andWhere("tenant.status != :deleted", { deleted: TenantStatus.DELETED })
      .getMany();

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        is_super_admin: req.user?.is_super_admin || false,
      },
      tenants: memberships.map((m) => ({
        id: m.tenant.id,
        name: m.tenant.name,
        slug: m.tenant.slug,
        role: m.role,
      })),
    });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ error: "Failed to get user info" });
  }
});

// --- PUT /api/auth/me ---
router.put("/me", authenticate, validate(updateUserSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOneBy({ id: req.user!.id });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (req.body.full_name !== undefined) {
      user.full_name = req.body.full_name;
    }
    if (req.body.avatar_url !== undefined) {
      user.avatar_url = req.body.avatar_url;
    }

    await userRepo.save(user);

    res.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
    });
  } catch (err) {
    console.error("Update me error:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// --- POST /api/auth/change-password ---
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { current_password, new_password } = req.body;

      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOneBy({ id: req.user!.id });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      // Verify current password
      const isValid = await bcrypt.compare(current_password, user.password_hash);
      if (!isValid) {
        res.status(400).json({ error: "Current password is incorrect" });
        return;
      }

      // Update password
      user.password_hash = await bcrypt.hash(new_password, 10);
      await userRepo.save(user);

      res.json({ message: "Password changed successfully" });
    } catch (err) {
      console.error("Change password error:", err);
      res.status(500).json({ error: "Failed to change password" });
    }
  }
);

export { router as authRoutes };

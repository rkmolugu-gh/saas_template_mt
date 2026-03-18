import { Router, Request, Response } from "express";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { AppDataSource } from "../data-source";
import { User } from "../../../backend/src/entities/User";
import { Tenant, TenantStatus } from "../../../backend/src/entities/Tenant";
import { TenantMembership, MemberRole } from "../../../backend/src/entities/TenantMembership";
import { validate } from "../utils/validate";
import { getParamOrFail } from "../utils/params";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "change-me-to-a-random-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// --- Schemas ---
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  tenant_name: z.string().min(1),
  tenant_slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// --- POST /api/auth/signup ---
router.post("/signup", validate(signupSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, full_name, tenant_name, tenant_slug } = req.body;
    const userRepo = AppDataSource.getRepository(User);
    const tenantRepo = AppDataSource.getRepository(Tenant);
    const memberRepo = AppDataSource.getRepository(TenantMembership);

    // Check existing user
    const existing = await userRepo.findOneBy({ email });
    if (existing) {
      res.status(409).json({ error: "User already exists" });
      return;
    }

    // Check existing tenant slug
    const existingTenant = await tenantRepo.findOneBy({ slug: tenant_slug });
    if (existingTenant) {
      res.status(409).json({ error: "Tenant slug already taken" });
      return;
    }

    // Create user
    const password_hash = await bcrypt.hash(password, 10);
    const user = await userRepo.save(userRepo.create({ email, full_name, password_hash }));

    // Create tenant
    const tenant = await tenantRepo.save(
      tenantRepo.create({ name: tenant_name, slug: tenant_slug, status: TenantStatus.ACTIVE, settings: {} })
    );

    // Create membership as owner
    await memberRepo.save(memberRepo.create({ tenant_id: tenant.id, user_id: user.id, role: MemberRole.OWNER }));

    // Generate JWT
    const payload = { id: user.id, email: user.email, full_name: user.full_name };
    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
    const token = jwt.sign(payload, JWT_SECRET, options);

    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name },
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    });
  } catch (err) {
    res.status(500).json({ error: "Signup failed" });
  }
});

// --- POST /api/auth/login ---
router.post("/login", validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const userRepo = AppDataSource.getRepository(User);

    const user = await userRepo.findOneBy({ email });
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Get user's tenants
    const memberRepo = AppDataSource.getRepository(TenantMembership);
    const memberships = await memberRepo.find({
      where: { user_id: user.id },
      relations: ["tenant"],
    });

    const payload = { id: user.id, email: user.email, full_name: user.full_name };
    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN as any };
    const token = jwt.sign(payload, JWT_SECRET, options);

    res.json({
      token,
      user: { id: user.id, email: user.email, full_name: user.full_name },
      tenants: memberships.map((m) => ({
        id: m.tenant.id,
        name: m.tenant.name,
        slug: m.tenant.slug,
        role: m.role,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

export { router as authRoutes };

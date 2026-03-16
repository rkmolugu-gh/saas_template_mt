import { Router, Response } from "express";
import { z } from "zod";
import { AppDataSource } from "../data-source";
import { File } from "../../../backend/src/entities/File";
import { authenticate } from "../middleware/auth";
import { tenantScope, TenantScopedRequest } from "../middleware/tenantScope";
import { validate } from "../utils/validate";
import { IsNull } from "typeorm";

const router = Router();

const createFileSchema = z.object({
  name: z.string().min(1),
  original_name: z.string().min(1),
  mime_type: z.string().min(1),
  size_bytes: z.number().int().positive(),
  storage_path: z.string().min(1),
  folder: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  is_public: z.boolean().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

const updateFileSchema = z.object({
  name: z.string().min(1).optional(),
  folder: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  is_public: z.boolean().optional(),
});

// GET /api/files — list files for current tenant
router.get("/", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const { folder, search } = req.query;
    const qb = AppDataSource.getRepository(File)
      .createQueryBuilder("file")
      .where("file.tenant_id = :tenantId", { tenantId: req.tenantId })
      .andWhere("file.deleted_at IS NULL");

    if (folder) qb.andWhere("file.folder = :folder", { folder });
    if (search) qb.andWhere("file.name ILIKE :search", { search: `%${search}%` });

    qb.orderBy("file.created_at", "DESC");
    const files = await qb.getMany();
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: "Failed to list files" });
  }
});

// GET /api/files/:id — get single file
router.get("/:id", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const file = await AppDataSource.getRepository(File).findOneBy({
      id: req.params.id,
      tenant_id: req.tenantId,
      deleted_at: IsNull(),
    });
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    res.json(file);
  } catch (err) {
    res.status(500).json({ error: "Failed to get file" });
  }
});

// POST /api/files — create file record
router.post("/", authenticate, tenantScope, validate(createFileSchema), async (req: TenantScopedRequest, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(File);
    const file = repo.create({
      ...req.body,
      tenant_id: req.tenantId!,
      uploaded_by: req.user!.id,
    });
    const saved = await repo.save(file);
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: "Failed to create file" });
  }
});

// PUT /api/files/:id — update file metadata
router.put("/:id", authenticate, tenantScope, validate(updateFileSchema), async (req: TenantScopedRequest, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(File);
    const file = await repo.findOneBy({ id: req.params.id, tenant_id: req.tenantId, deleted_at: IsNull() });
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    Object.assign(file, req.body);
    await repo.save(file);
    res.json(file);
  } catch (err) {
    res.status(500).json({ error: "Failed to update file" });
  }
});

// DELETE /api/files/:id — soft delete file
router.delete("/:id", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(File);
    const file = await repo.findOneBy({ id: req.params.id, tenant_id: req.tenantId });
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    file.deleted_at = new Date();
    await repo.save(file);
    res.json({ message: "File deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete file" });
  }
});

export { router as fileRoutes };

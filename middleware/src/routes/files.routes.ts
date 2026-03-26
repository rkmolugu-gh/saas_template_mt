import { Router, Response } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { AppDataSource } from "../data-source";
import { File } from "../../../backend/src/entities/File";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { tenantScope, TenantScopedRequest } from "../middleware/tenantScope";
import { requireRole } from "../middleware/requireRole";
import { MemberRole } from "../../../backend/src/entities/TenantMembership";
import { validate } from "../utils/validate";
import { IsNull } from "typeorm";

const router = Router();

// Multer configuration for file uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "50", 10);

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const tenantId = (req as TenantScopedRequest).tenantId;
    if (!tenantId) {
      cb(new Error("Tenant ID is required"), "");
      return;
    }
    const tenantDir = path.join(UPLOAD_DIR, tenantId);
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    cb(null, tenantDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
  },
});

// Schemas
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

// --- GET /api/files — list files for current tenant ---
router.get("/", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const { folder, search, limit = "50", offset = "0" } = req.query;

    const qb = AppDataSource.getRepository(File)
      .createQueryBuilder("file")
      .where("file.tenant_id = :tenantId", { tenantId: req.tenantId })
      .andWhere("file.deleted_at IS NULL");

    if (folder) {
      qb.andWhere("file.folder = :folder", { folder });
    }
    if (search) {
      qb.andWhere("file.name ILIKE :search", { search: `%${search}%` });
    }

    qb.orderBy("file.created_at", "DESC")
      .limit(parseInt(limit as string, 10))
      .offset(parseInt(offset as string, 10));

    const files = await qb.getMany();
    res.json(files);
  } catch (err) {
    console.error("List files error:", err);
    res.status(500).json({ error: "Failed to list files" });
  }
});

// --- GET /api/files/:id — get single file ---
router.get("/:id", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const fileId = req.params.id as string;
    const file = await AppDataSource.getRepository(File).findOne({
      where: {
        id: fileId,
        tenant_id: req.tenantId,
        deleted_at: IsNull(),
      },
    });

    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    res.json(file);
  } catch (err) {
    console.error("Get file error:", err);
    res.status(500).json({ error: "Failed to get file" });
  }
});

// --- POST /api/files/upload — upload a file ---
router.post(
  "/upload",
  authenticate,
  tenantScope,
  requireRole(MemberRole.MEMBER, MemberRole.ADMIN, MemberRole.OWNER),
  upload.single("file"),
  async (req: TenantScopedRequest, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No file uploaded" });
        return;
      }

      const { folder, description, is_public } = req.body;

      const fileRepo = AppDataSource.getRepository(File);
      const file = fileRepo.create({
        tenant_id: req.tenantId,
        uploaded_by: req.user!.id,
        name: req.file.filename,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        storage_path: req.file.path,
        folder: folder || null,
        description: description || null,
        is_public: is_public === "true",
        metadata: {},
      });

      const saved = await fileRepo.save(file);
      res.status(201).json(saved);
    } catch (err) {
      console.error("Upload file error:", err);
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
);

// --- POST /api/files — create file record (metadata only) ---
router.post(
  "/",
  authenticate,
  tenantScope,
  requireRole(MemberRole.MEMBER, MemberRole.ADMIN, MemberRole.OWNER),
  validate(createFileSchema),
  async (req: TenantScopedRequest, res: Response) => {
    try {
      const fileRepo = AppDataSource.getRepository(File);
      const file = fileRepo.create({
        ...req.body,
        tenant_id: req.tenantId,
        uploaded_by: req.user!.id,
      });
      const saved = await fileRepo.save(file);
      res.status(201).json(saved);
    } catch (err) {
      console.error("Create file error:", err);
      res.status(500).json({ error: "Failed to create file record" });
    }
  }
);

// --- PUT /api/files/:id — update file metadata ---
router.put(
  "/:id",
  authenticate,
  tenantScope,
  requireRole(MemberRole.MEMBER, MemberRole.ADMIN, MemberRole.OWNER),
  validate(updateFileSchema),
  async (req: TenantScopedRequest, res: Response) => {
    try {
      const fileId = req.params.id as string;
      const fileRepo = AppDataSource.getRepository(File);
      const file = await fileRepo.findOne({
        where: { id: fileId, tenant_id: req.tenantId, deleted_at: IsNull() },
      });

      if (!file) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      if (req.body.name !== undefined) file.name = req.body.name;
      if (req.body.folder !== undefined) file.folder = req.body.folder;
      if (req.body.description !== undefined) file.description = req.body.description;
      if (req.body.is_public !== undefined) file.is_public = req.body.is_public;

      await fileRepo.save(file);
      res.json(file);
    } catch (err) {
      console.error("Update file error:", err);
      res.status(500).json({ error: "Failed to update file" });
    }
  }
);

// --- DELETE /api/files/:id — soft delete file ---
router.delete(
  "/:id",
  authenticate,
  tenantScope,
  requireRole(MemberRole.MEMBER, MemberRole.ADMIN, MemberRole.OWNER),
  async (req: TenantScopedRequest, res: Response) => {
    try {
      const fileId = req.params.id as string;
      const fileRepo = AppDataSource.getRepository(File);
      const file = await fileRepo.findOne({
        where: { id: fileId, tenant_id: req.tenantId },
      });

      if (!file) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      file.deleted_at = new Date();
      await fileRepo.save(file);

      res.json({ message: "File deleted" });
    } catch (err) {
      console.error("Delete file error:", err);
      res.status(500).json({ error: "Failed to delete file" });
    }
  }
);

// --- GET /api/files/:id/download — download file ---
router.get("/:id/download", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const fileId = req.params.id as string;
    const file = await AppDataSource.getRepository(File).findOne({
      where: { id: fileId, tenant_id: req.tenantId, deleted_at: IsNull() },
    });

    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    if (!fs.existsSync(file.storage_path)) {
      res.status(404).json({ error: "File not found on disk" });
      return;
    }

    res.download(file.storage_path, file.original_name);
  } catch (err) {
    console.error("Download file error:", err);
    res.status(500).json({ error: "Failed to download file" });
  }
});

export { router as fileRoutes };

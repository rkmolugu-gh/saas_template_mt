import { Router, Response } from "express";
import { z } from "zod";
import { AppDataSource } from "../data-source";
import { Item, ItemStatus } from "../../../backend/src/entities/Item";
import { ItemRevision } from "../../../backend/src/entities/ItemRevision";
import { authenticate, AuthenticatedRequest } from "../middleware/auth";
import { tenantScope, TenantScopedRequest } from "../middleware/tenantScope";
import { requireRole } from "../middleware/requireRole";
import { MemberRole } from "../../../backend/src/entities/TenantMembership";
import { validate } from "../utils/validate";
import { getParamOrFail } from "../utils/params";
import { IsNull } from "typeorm";

const router = Router();

const createItemSchema = z.object({
  title: z.string().min(1),
  body: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateItemSchema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  change_summary: z.string().optional(),
});

// GET /api/items — list items for current tenant
router.get("/", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const { status, category, search } = req.query;
    const qb = AppDataSource.getRepository(Item)
      .createQueryBuilder("item")
      .where("item.tenant_id = :tenantId", { tenantId: req.tenantId })
      .andWhere("item.deleted_at IS NULL");

    if (status) qb.andWhere("item.status = :status", { status });
    if (category) qb.andWhere("item.category = :category", { category });
    if (search) qb.andWhere("item.title ILIKE :search", { search: `%${search}%` });

    qb.orderBy("item.updated_at", "DESC");
    const items = await qb.getMany();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to list items" });
  }
});

// GET /api/items/:id — get single item with current revision
router.get("/:id", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const itemId = getParamOrFail(req, "id");
    const item = await AppDataSource.getRepository(Item).findOne({
      where: { id: itemId, tenant_id: req.tenantId, deleted_at: IsNull() },
      relations: ["current_revision"],
    });
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to get item" });
  }
});

// POST /api/items — create item (with first revision)
router.post("/", authenticate, tenantScope, validate(createItemSchema), async (req: TenantScopedRequest, res: Response) => {
  try {
    const { title, body, data, category, tags } = req.body;
    const itemRepo = AppDataSource.getRepository(Item);
    const revisionRepo = AppDataSource.getRepository(ItemRevision);

    // Create item
    const item = itemRepo.create({
      tenant_id: req.tenantId!,
      title,
      category: category || null,
      tags: tags || null,
      created_by: req.user!.id,
      status: ItemStatus.DRAFT,
    });
    const savedItem = await itemRepo.save(item);

    // Create first revision
    const revision = revisionRepo.create({
      item_id: savedItem.id,
      tenant_id: req.tenantId!,
      revision_number: 1,
      title,
      body: body || null,
      data: data || null,
      change_summary: "Initial version",
      created_by: req.user!.id,
    });
    const savedRevision = await revisionRepo.save(revision);

    // Update item with current revision
    savedItem.current_revision_id = savedRevision.id;
    await itemRepo.save(savedItem);

    res.status(201).json({ ...savedItem, current_revision: savedRevision });
  } catch (err) {
    res.status(500).json({ error: "Failed to create item" });
  }
});

// PUT /api/items/:id — update item (creates new revision)
router.put("/:id", authenticate, tenantScope, validate(updateItemSchema), async (req: TenantScopedRequest, res: Response) => {
  try {
    const itemRepo = AppDataSource.getRepository(Item);
    const revisionRepo = AppDataSource.getRepository(ItemRevision);

    const item = await itemRepo.findOne({
      where: { id: req.params.id, tenant_id: req.tenantId, deleted_at: IsNull() },
    });
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    const { title, body, data, category, tags, status, change_summary } = req.body;

    // Update item fields
    if (title !== undefined) item.title = title;
    if (category !== undefined) item.category = category;
    if (tags !== undefined) item.tags = tags;
    if (status !== undefined) item.status = status as ItemStatus;

    // Get latest revision number
    const latestRevision = await revisionRepo
      .createQueryBuilder("r")
      .where("r.item_id = :itemId", { itemId: item.id })
      .orderBy("r.revision_number", "DESC")
      .getOne();

    const nextRevisionNumber = (latestRevision?.revision_number || 0) + 1;

    // Create new revision
    const revision = revisionRepo.create({
      item_id: item.id,
      tenant_id: req.tenantId!,
      revision_number: nextRevisionNumber,
      title: title || item.title,
      body: body !== undefined ? body : latestRevision?.body || null,
      data: data !== undefined ? data : latestRevision?.data || null,
      change_summary: change_summary || null,
      created_by: req.user!.id,
    });
    const savedRevision = await revisionRepo.save(revision);

    item.current_revision_id = savedRevision.id;
    await itemRepo.save(item);

    res.json({ ...item, current_revision: savedRevision });
  } catch (err) {
    res.status(500).json({ error: "Failed to update item" });
  }
});

// GET /api/items/:id/revisions — list all revisions
router.get("/:id/revisions", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const revisions = await AppDataSource.getRepository(ItemRevision).find({
      where: { item_id: req.params.id, tenant_id: req.tenantId },
      order: { revision_number: "DESC" },
    });
    res.json(revisions);
  } catch (err) {
    res.status(500).json({ error: "Failed to list revisions" });
  }
});

// POST /api/items/:id/rollback/:revisionId — rollback to a previous revision
router.post("/:id/rollback/:revisionId", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const itemRepo = AppDataSource.getRepository(Item);
    const revisionRepo = AppDataSource.getRepository(ItemRevision);

    const item = await itemRepo.findOneBy({ id: req.params.id, tenant_id: req.tenantId });
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    const targetRevision = await revisionRepo.findOneBy({ id: req.params.revisionId, item_id: item.id });
    if (!targetRevision) {
      res.status(404).json({ error: "Revision not found" });
      return;
    }

    // Get latest revision number
    const latestRevision = await revisionRepo
      .createQueryBuilder("r")
      .where("r.item_id = :itemId", { itemId: item.id })
      .orderBy("r.revision_number", "DESC")
      .getOne();

    // Create new revision as a copy of target
    const rollbackRevision = revisionRepo.create({
      item_id: item.id,
      tenant_id: req.tenantId!,
      revision_number: (latestRevision?.revision_number || 0) + 1,
      title: targetRevision.title,
      body: targetRevision.body,
      data: targetRevision.data,
      change_summary: `Rollback to revision ${targetRevision.revision_number}`,
      created_by: req.user!.id,
    });
    const savedRevision = await revisionRepo.save(rollbackRevision);

    item.title = targetRevision.title;
    item.current_revision_id = savedRevision.id;
    await itemRepo.save(item);

    res.json({ ...item, current_revision: savedRevision });
  } catch (err) {
    res.status(500).json({ error: "Failed to rollback item" });
  }
});

// DELETE /api/items/:id — soft delete item
router.delete("/:id", authenticate, tenantScope, async (req: TenantScopedRequest, res: Response) => {
  try {
    const repo = AppDataSource.getRepository(Item);
    const item = await repo.findOneBy({ id: req.params.id, tenant_id: req.tenantId });
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    item.deleted_at = new Date();
    await repo.save(item);
    res.json({ message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete item" });
  }
});

export { router as itemRoutes };

/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1, Sonnet 5); Codex (model: GPT-5.6 Sol, GPT-5.6 Terra); Google Antigravity Agent, date: 2026-09-20 to 2026-10-30
 * Scope: Protected mutating supplier endpoints with JWT authentication and Admin RBAC, added sorting and pagination query support; updated across 9 AI-assisted revisions through D4 wrap-up (merge of admin_dashboard into main: this file's validation logic (including the 2026-10-17 latitude/longitude checks above) was extracted into..).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */





import { Router, Request, RequestHandler, Response } from 'express';
import {
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierQueryOptions,
} from '@campus-errand/common-dtos';
import {
  createNewSupplier,
  findSupplierByIdOrCode,
  listSuppliers,
  removeSupplier,
  SupplierConflictError,
  SupplierNotFoundError,
  SupplierValidationError,
  toggleSupplierStatus,
  updateExistingSupplier,
} from './supplierService';

// GET /api/suppliers
export async function getSuppliers(req: Request, res: Response) {
  try {
    const { campusZone, category, search, isActive, sortBy, sortOrder, page, limit } = req.query;

    let activeFilter: boolean | undefined = undefined;
    if (isActive === 'true') activeFilter = true;
    if (isActive === 'false') activeFilter = false;

    const queryOptions: SupplierQueryOptions = {
      campusZone: campusZone ? String(campusZone) : undefined,
      category: category ? String(category) : undefined,
      search: search ? String(search) : undefined,
      isActive: activeFilter,
      sortBy: sortBy as SupplierQueryOptions['sortBy'],
      sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
      page: page !== undefined ? parseInt(String(page), 10) : undefined,
      limit: limit !== undefined ? parseInt(String(limit), 10) : undefined,
    };

    const result = await listSuppliers(queryOptions);

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('Error fetching suppliers:', err);
    return res.status(500).json({ success: false, error: (err instanceof Error && err.message) || 'Internal server error' });
  }
}

// GET /api/suppliers/:id
export async function getSupplier(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const supplier = await findSupplierByIdOrCode(id);
    return res.json({ success: true, data: supplier });
  } catch (err) {
    if (err instanceof SupplierNotFoundError) {
      return res.status(404).json({ success: false, error: err.message });
    }
    console.error('Error fetching supplier:', err);
    return res.status(500).json({ success: false, error: (err instanceof Error && err.message) || 'Internal server error' });
  }
}

// POST /api/suppliers (Admin Only)
export async function createSupplier(req: Request, res: Response) {
  try {
    const body: CreateSupplierRequest = req.body;
    const supplier = await createNewSupplier(body);
    return res.status(201).json({
      success: true,
      data: supplier,
      message: 'Supplier created successfully',
    });
  } catch (err) {
    if (err instanceof SupplierValidationError) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (err instanceof SupplierConflictError) {
      return res.status(409).json({
        success: false,
        error: err.message,
        ...(err.duplicate ? { duplicate: err.duplicate } : {}),
      });
    }
    console.error('Error creating supplier:', err);
    return res.status(500).json({ success: false, error: (err instanceof Error && err.message) || 'Internal server error' });
  }
}

// PUT /api/suppliers/:id (Admin Only)
export async function updateSupplier(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const body: UpdateSupplierRequest = req.body;
    const updated = await updateExistingSupplier(id, body);
    return res.json({
      success: true,
      data: updated,
      message: 'Supplier updated successfully',
    });
  } catch (err) {
    if (err instanceof SupplierNotFoundError) {
      return res.status(404).json({ success: false, error: err.message });
    }
    if (err instanceof SupplierValidationError) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (err instanceof SupplierConflictError) {
      return res.status(409).json({
        success: false,
        error: err.message,
        ...(err.duplicate ? { duplicate: err.duplicate } : {}),
      });
    }
    console.error('Error updating supplier:', err);
    return res.status(500).json({ success: false, error: (err instanceof Error && err.message) || 'Internal server error' });
  }
}

// PATCH /api/suppliers/:id/toggle (Admin Only)
export async function toggleSupplier(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updated = await toggleSupplierStatus(id);
    return res.json({
      success: true,
      data: updated,
      message: `Supplier ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (err) {
    if (err instanceof SupplierNotFoundError) {
      return res.status(404).json({ success: false, error: err.message });
    }
    console.error('Error toggling supplier status:', err);
    return res.status(500).json({ success: false, error: (err instanceof Error && err.message) || 'Internal server error' });
  }
}

// DELETE /api/suppliers/:id (Admin Only)
export async function deleteSupplier(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const permanent = req.query.permanent === 'true';
    await removeSupplier(id, permanent);
    return res.json({
      success: true,
      message: permanent
        ? 'Supplier permanently deleted'
        : 'Supplier marked as inactive (soft delete to preserve order history)',
    });
  } catch (err) {
    if (err instanceof SupplierNotFoundError) {
      return res.status(404).json({ success: false, error: err.message });
    }
    console.error('Error deleting supplier:', err);
    return res.status(500).json({ success: false, error: (err instanceof Error && err.message) || 'Internal server error' });
  }
}

export function createSupplierRouter(
  authenticateToken: RequestHandler,
  requireAdmin: RequestHandler,
): Router {
  const router = Router();

  // Public / Student Read Access
  router.get('/', getSuppliers);
  router.get('/:id', getSupplier);

  // Admin-Only Mutation Access
  router.post('/', authenticateToken, requireAdmin, createSupplier);
  router.put('/:id', authenticateToken, requireAdmin, updateSupplier);
  router.patch('/:id/toggle', authenticateToken, requireAdmin, toggleSupplier);
  router.delete('/:id', authenticateToken, requireAdmin, deleteSupplier);

  return router;
}

/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Protected mutating supplier endpoints with JWT authentication and Admin RBAC, added sorting and pagination query support.
 * Author review: (to be completed by author after review)
 */
/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Accepted configured Ed25519 authentication middleware for the author-approved Supplier Service migration.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by yanhwee)
/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-29
 * Scope: createSupplier and updateSupplier now check findDuplicateLocation() before writing, rejecting with
 * 409 and a `duplicate` object (name/category/building/floor of the conflicting record) if one is found.
 * updateSupplier merges the already-fetched `existing` row with the incoming partial body to get the
 * *effective* post-update values before checking, since PUT allows partial updates, and excludes its own id
 * so a no-op/unrelated update isn't flagged as duplicating itself.
 * Author review: (to be completed by author after review)
 */

import { Router, Request, RequestHandler, Response } from 'express';
import * as supplierRepository from '../database/supplierRepository';
import {
  CreateSupplierRequest,
  UpdateSupplierRequest,
  ApiResponse,
  SupplierDTO,
  SupplierQueryOptions,
} from '@campus-errand/common-dtos';

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
      sortBy: sortBy as any,
      sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
      page: page !== undefined ? parseInt(String(page), 10) : undefined,
      limit: limit !== undefined ? parseInt(String(limit), 10) : undefined,
    };

    const result = await supplierRepository.getSuppliers(queryOptions);

    return res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Error fetching suppliers:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

// GET /api/suppliers/:id
export async function getSupplier(req: Request, res: Response) {
  try {
    const { id } = req.params;
    let supplier = await supplierRepository.getSupplierById(id);

    // Also allow lookup by supplierCode if not found by UUID
    if (!supplier) {
      supplier = await supplierRepository.getSupplierByCode(id);
    }

    if (!supplier) {
      return res.status(404).json({ success: false, error: `Supplier '${id}' not found` });
    }

    return res.json({ success: true, data: supplier });
  } catch (err: any) {
    console.error('Error fetching supplier:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

// POST /api/suppliers (Admin Only)
export async function createSupplier(req: Request, res: Response) {
  try {
    const body: CreateSupplierRequest = req.body;

    if (!body.name || !body.campusZone || !body.exactLocation || !body.category || !body.building || !body.floor) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields. Required: name, campusZone, exactLocation, category, building, floor',
      });
    }

    const duplicate = await supplierRepository.findDuplicateLocation(body.name, body.category, body.building, body.floor);
    if (duplicate) {
      return res.status(409).json({
        success: false,
        error: 'A supplier already exists with this name, category, and location.',
        duplicate: {
          name: duplicate.name,
          category: duplicate.category,
          building: duplicate.building,
          floor: duplicate.floor,
        },
      });
    }

    const supplier = await supplierRepository.createSupplier(body);
    return res.status(201).json({
      success: true,
      data: supplier,
      message: 'Supplier created successfully',
    });
  } catch (err: any) {
    console.error('Error creating supplier:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

// PUT /api/suppliers/:id (Admin Only)
export async function updateSupplier(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const body: UpdateSupplierRequest = req.body;

    const existing = await supplierRepository.getSupplierById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: `Supplier '${id}' not found` });
    }

    const effective = {
      name: body.name ?? existing.name,
      category: body.category ?? existing.category,
      building: body.building ?? existing.building,
      floor: body.floor ?? existing.floor,
    };
    const duplicate = await supplierRepository.findDuplicateLocation(
      effective.name,
      effective.category,
      effective.building,
      effective.floor,
      id,
    );
    if (duplicate) {
      return res.status(409).json({
        success: false,
        error: 'A supplier already exists with this name, category, and location.',
        duplicate: {
          name: duplicate.name,
          category: duplicate.category,
          building: duplicate.building,
          floor: duplicate.floor,
        },
      });
    }

    const updated = await supplierRepository.updateSupplier(id, body);
    return res.json({
      success: true,
      data: updated,
      message: 'Supplier updated successfully',
    });
  } catch (err: any) {
    console.error('Error updating supplier:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

// PATCH /api/suppliers/:id/toggle (Admin Only)
export async function toggleSupplier(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updated = await supplierRepository.toggleSupplierActive(id);

    if (!updated) {
      return res.status(404).json({ success: false, error: `Supplier '${id}' not found` });
    }

    return res.json({
      success: true,
      data: updated,
      message: `Supplier ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (err: any) {
    console.error('Error toggling supplier status:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

// DELETE /api/suppliers/:id (Admin Only)
export async function deleteSupplier(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const permanent = req.query.permanent === 'true';

    const existing = await supplierRepository.getSupplierById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: `Supplier '${id}' not found` });
    }

    await supplierRepository.deleteSupplier(id, !permanent);

    return res.json({
      success: true,
      message: permanent
        ? 'Supplier permanently deleted'
        : 'Supplier marked as inactive (soft delete to preserve order history)',
    });
  } catch (err: any) {
    console.error('Error deleting supplier:', err);
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
}

// AI-generated (edited by ngkhengyang)
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

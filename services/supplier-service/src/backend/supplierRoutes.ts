import { Router, Request, Response } from 'express';
import * as supplierRepository from '../database/supplierRepository';
import { CreateSupplierRequest, UpdateSupplierRequest, ApiResponse, SupplierDTO } from '@campus-errand/common-dtos';

// GET /api/suppliers
export async function getSuppliers(req: Request, res: Response) {
  try {
    const { campusZone, category, search, isActive } = req.query;

    let activeFilter: boolean | undefined = undefined;
    if (isActive === 'true') activeFilter = true;
    if (isActive === 'false') activeFilter = false;

    const suppliers = await supplierRepository.getSuppliers({
      campusZone: campusZone ? String(campusZone) : undefined,
      category: category ? String(category) : undefined,
      search: search ? String(search) : undefined,
      isActive: activeFilter,
    });

    return res.json({ success: true, data: suppliers });
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

// POST /api/suppliers
export async function createSupplier(req: Request, res: Response) {
  try {
    const body: CreateSupplierRequest = req.body;

    if (!body.name || !body.campusZone || !body.exactLocation || !body.category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields. Required: name, campusZone, exactLocation, category',
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

// PUT /api/suppliers/:id
export async function updateSupplier(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const body: UpdateSupplierRequest = req.body;

    const existing = await supplierRepository.getSupplierById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: `Supplier '${id}' not found` });
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

// PATCH /api/suppliers/:id/toggle
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

// DELETE /api/suppliers/:id
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

const router = Router();

router.get('/', getSuppliers);
router.get('/:id', getSupplier);
router.post('/', createSupplier);
router.put('/:id', updateSupplier);
router.patch('/:id/toggle', toggleSupplier);
router.delete('/:id', deleteSupplier);

export default router;

/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Opus 5), date: 2026-09-19
 * Scope: Generated boilerplate Express router and CRUD handler skeletons for suppliers.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by jagdeepsh)
import { Router, Request, Response } from 'express';
import * as supplierRepository from '../database/supplierRepository';

// Supplier CRUD routes. Each handler forwards to the database layer
// (database/supplierRepository.ts). For now only the supplier name is used;
// remaining fields and validation are TODO.

// POST /api/suppliers  { "name": "..." }
export async function createSupplier(req: Request, res: Response) {
  const name: string = req.body?.name;
  if (!name) {
    return res.status(400).json({ success: false, error: 'name is required' });
  }
  // TODO: validate and pass the remaining supplier fields
  const supplier = await supplierRepository.createSupplier(name);
  return res.status(201).json({ success: true, data: supplier });
}

// GET /api/suppliers
export async function getSuppliers(_req: Request, res: Response) {
  // TODO: support query filters (type, building, ...)
  const suppliers = await supplierRepository.getSuppliers();
  return res.json({ success: true, data: suppliers });
}

// GET /api/suppliers/:name
export async function getSupplier(req: Request, res: Response) {
  const name: string = req.params.name;
  const supplier = await supplierRepository.getSupplier(name);
  if (!supplier) {
    return res.status(404).json({ success: false, error: 'Supplier not found' });
  }
  return res.json({ success: true, data: supplier });
}

// PUT /api/suppliers/:name
export async function updateSupplier(req: Request, res: Response) {
  const name: string = req.params.name;
  // TODO: read updated fields from req.body and pass them through
  const supplier = await supplierRepository.updateSupplier(name);
  return res.json({ success: true, data: supplier });
}

// DELETE /api/suppliers/:name
export async function deleteSupplier(req: Request, res: Response) {
  const name: string = req.params.name;
  await supplierRepository.deleteSupplier(name);
  return res.status(204).send();
}

const router = Router();

router.post('/', createSupplier);
router.get('/', getSuppliers);
router.get('/:name', getSupplier);
router.put('/:name', updateSupplier);
router.delete('/:name', deleteSupplier);

export default router;

/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Opus 5), date: 2026-09-19
 * Scope: Generated boilerplate data-access functions (CRUD by supplier name) using Prisma.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by jagdeepsh)
import { prisma } from './client';

// Application-side database script.
// Every request that travels frontend -> backend (backend/supplierRoutes.ts)
// ends up calling one of these functions to touch PostgreSQL via Prisma.
// For now each operation is keyed only by supplier name; other fields TODO.

export async function createSupplier(name: string) {
  // TODO: accept and persist the remaining supplier fields
  return prisma.supplier.create({ data: { name } });
}

export async function getSuppliers() {
  // TODO: add filtering (type, building, opening hours, ...) and pagination
  return prisma.supplier.findMany({ orderBy: { name: 'asc' } });
}

export async function getSupplier(name: string) {
  return prisma.supplier.findUnique({ where: { name } });
}

export async function updateSupplier(name: string) {
  // TODO: accept the fields to update; currently a no-op update keyed by name
  return prisma.supplier.update({ where: { name }, data: {} });
}

export async function deleteSupplier(name: string) {
  return prisma.supplier.delete({ where: { name } });
}

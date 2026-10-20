/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted supplier domain validation, duplicate location conflict checks, and CRUD business logic from supplierRoutes.ts into supplierService.ts.
 * Author review: (to be completed by yanhwee)
 */
// AI-generated (edited by yanhwee)
import {
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierQueryOptions,
} from '@campus-errand/common-dtos';
import * as supplierRepository from './supplierRepository';

export const DUPLICATE_LOCATION_ERROR =
  'A supplier already exists with this name, category, and location.';

export class SupplierValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupplierValidationError';
  }
}

export class SupplierNotFoundError extends Error {
  constructor(id: string) {
    super(`Supplier '${id}' not found`);
    this.name = 'SupplierNotFoundError';
  }
}

export class SupplierConflictError extends Error {
  readonly duplicate?: {
    name: string;
    category: string;
    building: string;
    floor: string;
  };

  constructor(duplicate?: {
    name: string;
    category: string;
    building: string;
    floor: string;
  }) {
    super(DUPLICATE_LOCATION_ERROR);
    this.name = 'SupplierConflictError';
    this.duplicate = duplicate;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code?: string }).code === 'P2002',
  );
}

export async function listSuppliers(options: SupplierQueryOptions) {
  return supplierRepository.getSuppliers(options);
}

export async function findSupplierByIdOrCode(id: string) {
  let supplier = await supplierRepository.getSupplierById(id);
  if (!supplier) {
    supplier = await supplierRepository.getSupplierByCode(id);
  }
  if (!supplier) {
    throw new SupplierNotFoundError(id);
  }
  return supplier;
}

export async function createNewSupplier(body: CreateSupplierRequest) {
  const required = [
    'name',
    'campusZone',
    'exactLocation',
    'category',
    'building',
    'floor',
  ] as const;
  if (required.some((key) => !String(body[key] ?? '').trim())) {
    throw new SupplierValidationError(
      'Missing required fields. Required: name, campusZone, exactLocation, category, building, floor',
    );
  }

  const duplicate = await supplierRepository.findDuplicateLocation(
    String(body.name).trim(),
    String(body.category).trim(),
    String(body.building).trim(),
    String(body.floor).trim(),
  );
  if (duplicate) {
    throw new SupplierConflictError({
      name: duplicate.name,
      category: duplicate.category,
      building: duplicate.building,
      floor: duplicate.floor,
    });
  }

  try {
    return await supplierRepository.createSupplier(body);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new SupplierConflictError();
    }
    throw err;
  }
}

export async function updateExistingSupplier(
  id: string,
  body: UpdateSupplierRequest,
) {
  const existing = await supplierRepository.getSupplierById(id);
  if (!existing) {
    throw new SupplierNotFoundError(id);
  }

  for (const key of ['name', 'category', 'building', 'floor'] as const) {
    if (body[key] !== undefined && !String(body[key]).trim()) {
      throw new SupplierValidationError(`${key} cannot be empty`);
    }
  }

  const effective = {
    name: String(body.name ?? existing.name).trim(),
    category: String(body.category ?? existing.category).trim(),
    building: String(body.building ?? existing.building).trim(),
    floor: String(body.floor ?? existing.floor).trim(),
  };

  const duplicate = await supplierRepository.findDuplicateLocation(
    effective.name,
    effective.category,
    effective.building,
    effective.floor,
    id,
  );
  if (duplicate) {
    throw new SupplierConflictError({
      name: duplicate.name,
      category: duplicate.category,
      building: duplicate.building,
      floor: duplicate.floor,
    });
  }

  try {
    return await supplierRepository.updateSupplier(id, body);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new SupplierConflictError();
    }
    throw err;
  }
}

export async function toggleSupplierStatus(id: string) {
  const updated = await supplierRepository.toggleSupplierActive(id);
  if (!updated) {
    throw new SupplierNotFoundError(id);
  }
  return updated;
}

export async function removeSupplier(id: string, permanent: boolean) {
  const existing = await supplierRepository.getSupplierById(id);
  if (!existing) {
    throw new SupplierNotFoundError(id);
  }
  await supplierRepository.deleteSupplier(id, !permanent);
}

/**
 * AI Assistance Disclosure:
 *
 * Tool: Google Antigravity Agent, date: 2026-11-09
 * Scope: Pushed supplier sorting (case-insensitive LOWER() on text columns with deterministic id tie-breaker)
 * and pagination (LIMIT/OFFSET + COUNT(*) OVER()) into PostgreSQL via prisma.$queryRaw, capping unpaginated
 * queries at 100 rows so high-concurrency load tests (#29, #33, #253) do not block the Node event loop or
 * exhaust the database connection pool (resolving #110 and #253).
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-24
 * Scope: Lint fix (PR #184): where and update objects typed as Prisma.SupplierWhereInput / SupplierUpdateInput instead of any.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-08
 * Scope: Relocated supplier repository to src/suppliers/supplierRepository.ts and updated prisma client import.
 * Author review: <to be completed by author after review>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-04
 * Scope: getSuppliers sorts and pages the matching rows in memory so text columns order without regard to letter
 * case (UAT S8); the database ORDER BY and the separate count query are gone.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Enhanced supplier repository with dynamic sorting, pagination, and total count calculations for Milestone D2.
 * Author review: (to be completed by author after review)
 *
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-29
 * Scope: Added findDuplicateLocation() for the new (name, category, building, floor) uniqueness check used by
 * createSupplier/updateSupplier in supplierRoutes.ts. Case-insensitive via Prisma's native mode: 'insensitive'
 * filter (already used elsewhere in this file for campusZone/category), matching the DB-level expression index
 * added in this same round's migration.
 * Author review: (to be completed by author after review)
 *
 * Tool: Claude Code (model: Sonnet 5), date: 2026-10-17
 * Scope: createSupplier no longer falls back latitude/longitude to null — both are required (validated by the
 * route layer) and the DB columns are now NOT NULL.
 * Author review: (to be completed by author after review)
 */

// AI-generated (edited by yanhwee)


import { prisma, Prisma, type Supplier } from '../database/client';
import {
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierQueryOptions,
} from '@campus-errand/common-dtos';

type SupplierRow = Supplier & { totalCount: number };

const SORT_SQL_BY_FIELD: Record<string, Prisma.Sql> = {
  name: Prisma.raw('LOWER("name")'),
  campusZone: Prisma.raw('LOWER("campus_zone")'),
  category: Prisma.raw('LOWER("category")'),
  createdAt: Prisma.raw('"created_at"'),
  supplierCode: Prisma.raw('LOWER("supplier_code")'),
};

export async function getSuppliers(filter?: SupplierQueryOptions) {
  const conditions: Prisma.Sql[] = [];

  if (filter?.campusZone) {
    conditions.push(Prisma.sql`LOWER("campus_zone") = LOWER(${filter.campusZone})`);
  }

  if (filter?.category) {
    conditions.push(Prisma.sql`LOWER("category") = LOWER(${filter.category})`);
  }

  if (filter?.isActive !== undefined) {
    conditions.push(Prisma.sql`"is_active" = ${filter.isActive}`);
  }

  if (filter?.search) {
    const term = filter.search.trim();
    if (term.length > 0) {
      const pattern = `%${term}%`;
      conditions.push(
        Prisma.sql`("name" ILIKE ${pattern} OR "exact_location" ILIKE ${pattern} OR "building" ILIKE ${pattern} OR "description" ILIKE ${pattern} OR "supplier_code" ILIKE ${pattern})`,
      );
    }
  }

  const whereSql =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
      : Prisma.empty;

  const sortBy = filter?.sortBy && filter.sortBy in SORT_SQL_BY_FIELD ? filter.sortBy : 'name';
  const sortExpr = SORT_SQL_BY_FIELD[sortBy];
  const sortDir = filter?.sortOrder === 'desc' ? Prisma.raw('DESC') : Prisma.raw('ASC');

  const isPaginated = filter?.page !== undefined || filter?.limit !== undefined;
  const rawPage = filter?.page !== undefined && Number.isFinite(filter.page) ? Math.trunc(filter.page) : 1;
  const rawLimit = filter?.limit !== undefined && Number.isFinite(filter.limit) ? Math.trunc(filter.limit) : 10;
  const page = isPaginated ? Math.max(1, rawPage) : 1;
  const limit = isPaginated ? Math.min(100, Math.max(1, rawLimit)) : 100;
  const skip = (page - 1) * limit;

  // AI-generated (edited by yanhwee)
  // Sort and page in PostgreSQL so text columns order case-insensitively with deterministic tie-breaking by id,
  // without loading or sorting the full table on the Node.js event loop (issues #110, #253).
  const rows = await prisma.$queryRaw<SupplierRow[]>(Prisma.sql`
    SELECT
      "id",
      "supplier_code" AS "supplierCode",
      "name",
      "campus_zone" AS "campusZone",
      "exact_location" AS "exactLocation",
      "category",
      "description",
      "building",
      "floor",
      "latitude",
      "longitude",
      "starting_time" AS "startingTime",
      "closing_time" AS "closingTime",
      "image_url" AS "imageUrl",
      "is_active" AS "isActive",
      "created_at" AS "createdAt",
      "updated_at" AS "updatedAt",
      COUNT(*) OVER()::int AS "totalCount"
    FROM "suppliers"
    ${whereSql}
    ORDER BY ${sortExpr} ${sortDir}, "id" ASC
    LIMIT ${limit} OFFSET ${skip}
  `);

  const suppliers: Supplier[] = rows.map(({ totalCount: _totalCount, ...supplier }) => supplier);
  let total = rows[0]?.totalCount ?? 0;
  if (rows.length === 0 && skip > 0) {
    const countRows = await prisma.$queryRaw<Array<{ totalCount: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS "totalCount"
      FROM "suppliers"
      ${whereSql}
    `);
    total = countRows[0]?.totalCount ?? 0;
  }

  if (isPaginated) {
    return {
      suppliers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  const effectiveLimit = suppliers.length;
  return {
    suppliers,
    total,
    page: 1,
    limit: effectiveLimit,
    totalPages: effectiveLimit > 0 ? Math.ceil(total / effectiveLimit) : 1,
  };
}

export async function getSupplierById(id: string) {
  return prisma.supplier.findUnique({ where: { id } });
}

export async function getSupplierByCode(supplierCode: string) {
  return prisma.supplier.findUnique({ where: { supplierCode } });
}

// Case-insensitive lookup for the (name, category, building, floor) uniqueness check. excludeId lets an
// update check "does anyone else already occupy this spot" without flagging the record against itself.
export async function findDuplicateLocation(
  name: string,
  category: string,
  building: string,
  floor: string,
  excludeId?: string,
) {
  return prisma.supplier.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      category: { equals: category, mode: 'insensitive' },
      building: { equals: building, mode: 'insensitive' },
      floor: { equals: floor, mode: 'insensitive' },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
}

async function generateNextSupplierCode(): Promise<string> {
  const count = await prisma.supplier.count();
  const nextNum = count + 1;
  const candidate = `SUP-${String(nextNum).padStart(3, '0')}`;
  const existing = await prisma.supplier.findUnique({ where: { supplierCode: candidate } });
  if (!existing) return candidate;
  return `SUP-${Date.now().toString().slice(-4)}`;
}

export async function createSupplier(data: CreateSupplierRequest) {
  const supplierCode = data.supplierCode?.trim() || (await generateNextSupplierCode());

  return prisma.supplier.create({
    data: {
      supplierCode,
      name: data.name.trim(),
      campusZone: data.campusZone.trim(),
      exactLocation: data.exactLocation.trim(),
      category: data.category,
      description: data.description?.trim() || null,
      building: data.building.trim(),
      floor: data.floor.trim(),
      latitude: data.latitude,
      longitude: data.longitude,
      startingTime: data.startingTime?.trim() || null,
      closingTime: data.closingTime?.trim() || null,
      imageUrl: data.imageUrl?.trim() || null,
      isActive: true,
    },
  });
}

export async function updateSupplier(id: string, data: UpdateSupplierRequest) {
  const updateData: Prisma.SupplierUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.campusZone !== undefined) updateData.campusZone = data.campusZone.trim();
  if (data.exactLocation !== undefined) updateData.exactLocation = data.exactLocation.trim();
  if (data.category !== undefined) updateData.category = data.category;
  if (data.description !== undefined) updateData.description = data.description.trim();
  if (data.building !== undefined) updateData.building = data.building.trim();
  if (data.floor !== undefined) updateData.floor = data.floor.trim();
  if (data.latitude !== undefined) updateData.latitude = data.latitude;
  if (data.longitude !== undefined) updateData.longitude = data.longitude;
  if (data.startingTime !== undefined) updateData.startingTime = data.startingTime.trim();
  if (data.closingTime !== undefined) updateData.closingTime = data.closingTime.trim();
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl.trim();
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return prisma.supplier.update({
    where: { id },
    data: updateData,
  });
}

export async function toggleSupplierActive(id: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return null;

  return prisma.supplier.update({
    where: { id },
    data: { isActive: !supplier.isActive },
  });
}

export async function deleteSupplier(id: string, softDelete = true) {
  if (softDelete) {
    return prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }
  return prisma.supplier.delete({ where: { id } });
}

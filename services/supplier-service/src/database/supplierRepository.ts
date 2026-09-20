/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Enhanced supplier repository with dynamic sorting, pagination, and total count calculations for Milestone D2.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)

import { prisma } from './client';
import {
  CreateSupplierRequest,
  UpdateSupplierRequest,
  SupplierQueryOptions,
} from '@campus-errand/common-dtos';

export async function getSuppliers(filter?: SupplierQueryOptions) {
  const whereClause: any = {};

  if (filter?.campusZone) {
    whereClause.campusZone = { equals: filter.campusZone, mode: 'insensitive' };
  }

  if (filter?.category) {
    whereClause.category = { equals: filter.category, mode: 'insensitive' };
  }

  if (filter?.isActive !== undefined) {
    whereClause.isActive = filter.isActive;
  }

  if (filter?.search) {
    const term = filter.search.trim();
    if (term.length > 0) {
      whereClause.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { exactLocation: { contains: term, mode: 'insensitive' } },
        { building: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { supplierCode: { contains: term, mode: 'insensitive' } },
      ];
    }
  }

  // Determine sorting order
  const validSortFields = ['name', 'campusZone', 'category', 'createdAt', 'supplierCode'];
  const sortBy = filter?.sortBy && validSortFields.includes(filter.sortBy) ? filter.sortBy : 'name';
  const sortOrder = filter?.sortOrder === 'desc' ? 'desc' : 'asc';
  const orderBy = { [sortBy]: sortOrder };

  // If pagination is requested (page or limit provided)
  if (filter?.page !== undefined || filter?.limit !== undefined) {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 10));
    const skip = (page - 1) * limit;

    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.supplier.count({ where: whereClause }),
    ]);

    return {
      suppliers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Fallback: return full list
  const suppliers = await prisma.supplier.findMany({
    where: whereClause,
    orderBy,
  });

  return {
    suppliers,
    total: suppliers.length,
    page: 1,
    limit: suppliers.length,
    totalPages: 1,
  };
}

export async function getSupplierById(id: string) {
  return prisma.supplier.findUnique({ where: { id } });
}

export async function getSupplierByCode(supplierCode: string) {
  return prisma.supplier.findUnique({ where: { supplierCode } });
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
      building: data.building?.trim() || null,
      floor: data.floor?.trim() || null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      startingTime: data.startingTime?.trim() || null,
      closingTime: data.closingTime?.trim() || null,
      imageUrl: data.imageUrl?.trim() || null,
      isActive: true,
    },
  });
}

export async function updateSupplier(id: string, data: UpdateSupplierRequest) {
  const updateData: any = {};

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

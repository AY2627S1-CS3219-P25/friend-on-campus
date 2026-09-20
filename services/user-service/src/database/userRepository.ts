/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Implemented user database repository with CRUD, profile update protection, and role management.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)

import { prisma } from './client';
import { UserDTO, UserRole, UpdateUserProfileRequest } from '@campus-errand/common-dtos';
import { User } from './generated/client';

export function toUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    nusEmail: user.nusEmail,
    fullName: user.fullName,
    matricNumber: user.matricNumber,
    phoneNumber: user.phoneNumber ?? undefined,
    telegramHandle: user.telegramHandle ?? undefined,
    role: user.role as UserRole,
    ratingAvg: Number(user.ratingAvg),
    totalCompletedOrders: user.totalCompletedOrders,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function findUserByEmail(nusEmail: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { nusEmail: nusEmail.trim().toLowerCase() },
  });
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}

export async function findUserByMatric(matricNumber: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { matricNumber: matricNumber.trim().toUpperCase() },
  });
}

export interface CreateUserData {
  nusEmail: string;
  passwordHash: string;
  fullName: string;
  matricNumber: string;
  phoneNumber?: string;
  telegramHandle?: string;
  role?: UserRole;
}

export async function createUser(data: CreateUserData): Promise<UserDTO> {
  const created = await prisma.user.create({
    data: {
      nusEmail: data.nusEmail.trim().toLowerCase(),
      passwordHash: data.passwordHash,
      fullName: data.fullName.trim(),
      matricNumber: data.matricNumber.trim().toUpperCase(),
      phoneNumber: data.phoneNumber?.trim() || null,
      telegramHandle: data.telegramHandle?.trim() || null,
      role: data.role ?? 'STUDENT',
    },
  });
  return toUserDTO(created);
}

/**
 * Updates user profile while strictly protecting sensitive and immutable fields.
 * Any attempt to alter id, role, nusEmail, or matricNumber is ignored/prevented.
 */
export async function updateUserProfile(
  id: string,
  update: UpdateUserProfileRequest
): Promise<UserDTO> {
  const safeData: {
    fullName?: string;
    phoneNumber?: string | null;
    telegramHandle?: string | null;
  } = {};

  if (update.fullName !== undefined) {
    safeData.fullName = update.fullName.trim();
  }
  if (update.phoneNumber !== undefined) {
    safeData.phoneNumber = update.phoneNumber.trim() || null;
  }
  if (update.telegramHandle !== undefined) {
    safeData.telegramHandle = update.telegramHandle.trim() || null;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: safeData,
  });

  return toUserDTO(updated);
}

export async function updateUserRole(id: string, role: UserRole): Promise<UserDTO> {
  const updated = await prisma.user.update({
    where: { id },
    data: { role },
  });
  return toUserDTO(updated);
}

export async function countAdmins(): Promise<number> {
  return prisma.user.count({
    where: { role: 'ADMIN' },
  });
}

export async function listUsers(page = 1, limit = 20): Promise<{ users: UserDTO[]; total: number }> {
  const skip = (page - 1) * limit;
  const [records, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count(),
  ]);

  return {
    users: records.map(toUserDTO),
    total,
  };
}

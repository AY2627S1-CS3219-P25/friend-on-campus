/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-29
 * Scope: Strongly-typed session identity extraction utilities (getSessionUser, getSessionUserId) and header constants for perimeter-secured microservices.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import type { Request } from 'express';
import type { UserRole } from '@campus-errand/common-dtos';

export type { UserRole };

/**
 * Standardized HTTP headers used across the security perimeter to convey
 * verified user session information from the gateway to downstream microservices.
 */
export const SESSION_HEADERS = {
  USER_ID: 'x-user-id',
  USER_ROLE: 'x-user-role',
  USER_EMAIL: 'x-user-email',
  SESSION_ID: 'x-session-id',
} as const;

export interface SessionUser {
  userId: string;
  role: UserRole;
  sessionId?: string;
  email?: string;
}

/**
 * Extracts the verified user session from incoming perimeter request headers.
 * Returns null if the request is unauthenticated or headers are missing.
 */
export function getSessionUser(req: Request): SessionUser | null {
  const userId = req.header(SESSION_HEADERS.USER_ID);
  const role = req.header(SESSION_HEADERS.USER_ROLE) as UserRole | undefined;

  if (userId && (role === 'STUDENT' || role === 'ADMIN')) {
    return {
      userId,
      role,
      sessionId: req.header(SESSION_HEADERS.SESSION_ID) || undefined,
      email: req.header(SESSION_HEADERS.USER_EMAIL) || undefined,
    };
  }
  return null;
}

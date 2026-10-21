/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted admin user directory API calls into src/api/users.ts.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

import { UserDTO } from '@campus-errand/common-dtos';
import { AuthFetchFn } from './suppliers';

export async function fetchUsersApi(authFetch: AuthFetchFn): Promise<UserDTO[]> {
  const res = await authFetch('/api/users?limit=100');
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
  }
  const json = await res.json();
  if (json.success && json.data) {
    return json.data.users || [];
  }
  throw new Error(json.error || 'Failed to parse users payload');
}

export async function toggleUserStatusApi(authFetch: AuthFetchFn, userId: string) {
  const res = await authFetch(`/api/users/${userId}/toggle-status`, { method: 'PATCH' });
  const data = await res.json();
  return { res, data };
}

export async function deleteUserApi(authFetch: AuthFetchFn, userId: string) {
  return authFetch(`/api/users/${userId}`, { method: 'DELETE' });
}

export async function toggleUserRoleApi(authFetch: AuthFetchFn, userId: string) {
  const res = await authFetch(`/api/users/${userId}/toggle-role`, { method: 'PATCH' });
  const data = await res.json();
  return { res, data };
}

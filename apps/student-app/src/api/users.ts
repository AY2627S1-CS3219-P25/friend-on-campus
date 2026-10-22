/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Handled non-JSON error responses gracefully in fetchCurrentUserProfile and updateCurrentUsername.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted user profile and account deletion API helpers from student-app App.tsx into modular api/users.ts.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { UserDTO } from '@campus-errand/common-dtos';
import { AuthFetchFn } from './auth';

export type UserApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

export async function fetchCurrentUserProfile(
  authFetch: AuthFetchFn
): Promise<UserApiResult<UserDTO>> {
  try {
    const res = await authFetch('/api/users/me');
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) {
      return { ok: true, data: data.data.user as UserDTO };
    }
    return {
      ok: false,
      code: data?.code || `HTTP_${res.status}`,
      message:
        data?.error ||
        (res.status >= 500
          ? 'User service is temporarily unavailable. Please try again in a moment.'
          : 'Failed to load profile.'),
    };
  } catch (err: any) {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      message: err.message || 'Could not reach the User Service.',
    };
  }
}

export async function updateCurrentUsername(
  authFetch: AuthFetchFn,
  username: string
): Promise<UserApiResult<UserDTO>> {
  try {
    const res = await authFetch('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ username }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) {
      return { ok: true, data: data.data.user as UserDTO };
    }
    return {
      ok: false,
      code: data?.code || `HTTP_${res.status}`,
      message:
        data?.error ||
        (res.status >= 500
          ? 'User service is temporarily unavailable. Please try again in a moment.'
          : 'Failed to update username.'),
    };
  } catch (err: any) {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      message: err.message || 'Could not reach the User Service.',
    };
  }
}

export async function deleteUserAccountById(
  authFetch: AuthFetchFn,
  userId: string
): Promise<UserApiResult<null>> {
  try {
    const res = await authFetch(`/api/users/${userId}`, { method: 'DELETE' });
    if (res.status === 204) {
      return { ok: true, data: null };
    }
    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      code: data.code || `HTTP_${res.status}`,
      message: data.error || 'Failed to delete account.',
    };
  } catch (err: any) {
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      message: err.message || 'Could not reach the User Service.',
    };
  }
}

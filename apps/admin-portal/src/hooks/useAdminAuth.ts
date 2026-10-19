/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted admin authentication, token refresh, and authFetch session hook into src/hooks/useAdminAuth.ts.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

import React, { useEffect, useRef, useState } from 'react';
import { adminLoginApi, adminLogoutApi, adminRefreshTokenApi } from '../api/auth';
import { decodeJwtRole, DemoRole } from '../constants';

export function useAdminAuth(onClearDomainState: () => void) {
  const [currentRole, setCurrentRole] = useState<DemoRole>('ADMIN');
  const [authToken, setAuthToken] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<{ code: string; message: string } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);

  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const refreshAccessToken = (): Promise<string | null> => {
    if (!refreshInFlight.current) {
      refreshInFlight.current = (async () => {
        try {
          const token = await adminRefreshTokenApi();
          if (token) setAuthToken(token);
          return token;
        } finally {
          refreshInFlight.current = null;
        }
      })();
    }
    return refreshInFlight.current;
  };

  useEffect(() => {
    refreshAccessToken()
      .then((token) => {
        if (token && decodeJwtRole(token) === 'ADMIN') {
          setCurrentRole('ADMIN');
          setIsAuthenticated(true);
        }
      })
      .finally(() => setIsCheckingSession(false));
  }, []);

  const clearLocalSession = () => {
    setIsAuthenticated(false);
    setAuthToken('');
    setLoginEmail('');
    setLoginPassword('');
    setLoginError(null);
    setRememberMe(false);
    setCurrentRole('GUEST');
    onClearDomainState();
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const { res, data } = await adminLoginApi(loginEmail, loginPassword, rememberMe);
      if (!res.ok || !data.success) {
        setLoginError({
          code: data.code || `HTTP_${res.status}`,
          message: data.error || 'Login failed. Please check your credentials.',
        });
        return;
      }
      const token: string = data.data.accessToken;
      const role = decodeJwtRole(token);
      if (role !== 'ADMIN') {
        setLoginError({
          code: 'FORBIDDEN_ROLE',
          message: `Access denied — this portal is for Administrators only. Your account role is ${role ?? 'UNKNOWN'}.`,
        });
        return;
      }
      setAuthToken(token);
      setCurrentRole('ADMIN');
      setIsAuthenticated(true);
      setLoginPassword('');
    } catch (err: any) {
      setLoginError({ code: 'NETWORK_ERROR', message: err.message || 'Could not reach the authentication server.' });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await adminLogoutApi();
    } catch {
      // Network failure logging out server-side shouldn't block clearing the local session below.
    } finally {
      clearLocalSession();
      setIsLoggingOut(false);
    }
  };

  const authFetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
    const send = (token: string) =>
      fetch(url, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
    const res = await send(authToken);
    if (res.status !== 401) return res;
    const token = await refreshAccessToken();
    if (token) return send(token);
    clearLocalSession();
    return res;
  };

  return {
    currentRole,
    authToken,
    isAuthenticated,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    isLoggingIn,
    loginError,
    isLoggingOut,
    isCheckingSession,
    rememberMe,
    setRememberMe,
    handleAdminLogin,
    handleLogout,
    clearLocalSession,
    authFetch,
  };
}

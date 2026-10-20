/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted authentication session state, silent refresh, and authFetch hook from student-app App.tsx into hooks/useAuthSession.ts.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import React, { useEffect, useRef, useState } from 'react';
import {
  loginWithPassword,
  logoutSession,
  refreshSessionAccessToken,
  registerUserAccount,
} from '../api/auth';
import { tokenUserId } from '../orders/useOrderSubmission';

export interface SignupFormData {
  username: string;
  email: string;
  password: string;
  retypePassword: string;
}

export function useAuthSession(onSessionCleared: () => void) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<{ code: string; message: string } | null>(null);

  const [signupData, setSignupData] = useState<SignupFormData>({
    username: '',
    email: '',
    password: '',
    retypePassword: '',
  });
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupError, setSignupError] = useState<{ code: string; message: string } | null>(null);

  const refreshInFlight = useRef<Promise<string | null> | null>(null);

  const refreshAccessToken = (): Promise<string | null> => {
    if (!refreshInFlight.current) {
      refreshInFlight.current = (async () => {
        try {
          const token = await refreshSessionAccessToken();
          if (token) {
            setAuthToken(token);
          }
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
        if (token) setIsAuthenticated(true);
      })
      .finally(() => setIsCheckingSession(false));
  }, []);

  const clearLocalSession = () => {
    onSessionCleared();
    setIsAuthenticated(false);
    setAuthToken('');
    setLoginEmail('');
    setLoginPassword('');
    setLoginError(null);
    setRememberMe(false);
  };

  const authFetch = async (url: string, init: RequestInit = {}): Promise<Response> => {
    const send = (token: string) =>
      fetch(url, {
        ...init,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
    const res = await send(authToken);
    if (res.status !== 401) return res;
    const token = await refreshAccessToken();
    if (token) return send(token);
    clearLocalSession();
    return res;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const result = await loginWithPassword(loginEmail, loginPassword, rememberMe);
      if (!result.ok) {
        setLoginError({
          code: result.code,
          message: result.message || 'Login failed. Please check your credentials.',
        });
        return;
      }
      setAuthToken(result.accessToken);
      setIsAuthenticated(true);
    } catch (err: any) {
      setLoginError({
        code: 'NETWORK_ERROR',
        message: err.message || 'Could not reach the authentication server.',
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (
      !signupData.username.trim() ||
      !signupData.email ||
      !signupData.password ||
      !signupData.retypePassword
    ) {
      setSignupError({
        code: 'VALIDATION_ERROR',
        message: 'Please fill in all required fields marked with *.',
      });
      return;
    }
    if (signupData.password !== signupData.retypePassword) {
      setSignupError({ code: 'PASSWORD_MISMATCH', message: 'Passwords do not match.' });
      return;
    }
    if (signupData.password.length < 8 || signupData.password.length > 24) {
      setSignupError({
        code: 'INVALID_PASSWORD',
        message: 'Password must be between 8 and 24 characters long.',
      });
      return;
    }

    setIsSigningUp(true);
    try {
      const regResult = await registerUserAccount({
        username: signupData.username.trim(),
        email: signupData.email,
        password: signupData.password,
      });
      if (!regResult.ok) {
        setSignupError({ code: regResult.code, message: regResult.message });
        return;
      }
      const login = await loginWithPassword(signupData.email, signupData.password);
      if (!login.ok) {
        setSignupError({
          code: login.code,
          message:
            login.message || 'Account created, but automatic login failed. Please log in.',
        });
        setAuthView('login');
        return;
      }
      setAuthToken(login.accessToken);
      setIsAuthenticated(true);
    } catch (err: any) {
      setSignupError({
        code: 'NETWORK_ERROR',
        message: err.message || 'Could not reach the registration server.',
      });
    } finally {
      setIsSigningUp(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutSession();
    } finally {
      clearLocalSession();
      setIsLoggingOut(false);
    }
  };

  const currentUserId = isAuthenticated ? tokenUserId(authToken) : null;

  return {
    isAuthenticated,
    isCheckingSession,
    isLoggingOut,
    authToken,
    authView,
    setAuthView,
    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    rememberMe,
    setRememberMe,
    isLoggingIn,
    loginError,
    setLoginError,
    signupData,
    setSignupData,
    isSigningUp,
    signupError,
    setSignupError,
    handleLogin,
    handleSignup,
    handleLogout,
    clearLocalSession,
    refreshAccessToken,
    authFetch,
    currentUserId,
  };
}

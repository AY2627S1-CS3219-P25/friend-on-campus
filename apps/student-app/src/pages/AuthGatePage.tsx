/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted login and signup gate page from student-app App.tsx into pages/AuthGatePage.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { RefreshCw } from 'lucide-react';
import React from 'react';
import { SignupFormData } from '../hooks/useAuthSession';

interface AuthGatePageProps {
  authView: 'login' | 'signup';
  setAuthView: (view: 'login' | 'signup') => void;
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPassword: string;
  setLoginPassword: (password: string) => void;
  rememberMe: boolean;
  setRememberMe: (checked: boolean) => void;
  isLoggingIn: boolean;
  loginError: { code: string; message: string } | null;
  setLoginError: (err: { code: string; message: string } | null) => void;
  onLoginSubmit: (e: React.FormEvent) => void;
  signupData: SignupFormData;
  setSignupData: (data: SignupFormData) => void;
  isSigningUp: boolean;
  signupError: { code: string; message: string } | null;
  setSignupError: (err: { code: string; message: string } | null) => void;
  onSignupSubmit: (e: React.FormEvent) => void;
}

export function AuthGatePage({
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
  onLoginSubmit,
  signupData,
  setSignupData,
  isSigningUp,
  signupError,
  setSignupError,
  onSignupSubmit,
}: AuthGatePageProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-5">
        <div className="text-center space-y-1">
          <h1 className="font-extrabold text-lg text-nus-blue">NUS CampusErrand</h1>
          <p className="text-xs text-slate-400">Dual-Role Peer Network</p>
        </div>

        {authView === 'login' ? (
          <form onSubmit={onLoginSubmit} className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 text-center">Log In</h2>
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm space-y-0.5">
                <p className="font-bold">{loginError.code}</p>
                <p>{loginError.message}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={isLoggingIn}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-nus-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={isLoggingIn}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-nus-blue"
              />
            </div>
            <label className="flex items-center space-x-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoggingIn}
                className="rounded border-slate-300 text-nus-blue focus:ring-nus-blue"
              />
              <span>Keep me logged in</span>
            </label>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center space-x-2 bg-nus-blue hover:bg-blue-900 disabled:opacity-60 text-white font-bold text-sm py-2.5 rounded-lg shadow transition"
            >
              {isLoggingIn && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{isLoggingIn ? 'Logging in...' : 'Log In'}</span>
            </button>
            <p className="text-center text-xs text-slate-500">
              If you don't have an account,{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthView('signup');
                  setLoginError(null);
                }}
                className="text-nus-orange font-bold underline"
              >
                Sign up
              </button>{' '}
              with us
            </p>
            <div className="border-t border-slate-200 pt-4">
              <a
                href="/admin/"
                className="flex min-h-11 w-full items-center justify-center rounded-lg border border-nus-blue px-4 py-2.5 text-sm font-bold text-nus-blue transition hover:bg-blue-50"
              >
                Admin Log In
              </a>
            </div>
          </form>
        ) : (
          <form onSubmit={onSignupSubmit} className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 text-center">Sign Up</h2>
            {signupError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm space-y-0.5">
                <p className="font-bold">{signupError.code}</p>
                <p>{signupError.message}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Username <span className="text-rose-600">*</span>
              </label>
              <p className="text-xs text-slate-400 mb-1">1-50 characters.</p>
              <input
                type="text"
                value={signupData.username}
                onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                disabled={isSigningUp}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-nus-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Email <span className="text-rose-600">*</span>
              </label>
              <input
                type="email"
                value={signupData.email}
                onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                disabled={isSigningUp}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-nus-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Password <span className="text-rose-600">*</span>
              </label>
              <p className="text-xs text-slate-400 mb-1">Must be 8-24 characters long.</p>
              <input
                type="password"
                value={signupData.password}
                onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                disabled={isSigningUp}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-nus-blue"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">
                Re-type Password <span className="text-rose-600">*</span>
              </label>
              <input
                type="password"
                value={signupData.retypePassword}
                onChange={(e) => setSignupData({ ...signupData, retypePassword: e.target.value })}
                disabled={isSigningUp}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-nus-blue"
              />
            </div>
            <p className="text-xs text-slate-400">
              Fields marked with <span className="text-rose-600 font-bold">*</span> are compulsory.
            </p>
            <button
              type="submit"
              disabled={isSigningUp}
              className="w-full flex items-center justify-center space-x-2 bg-nus-orange hover:bg-orange-600 disabled:opacity-60 text-white font-bold text-sm py-2.5 rounded-lg shadow transition"
            >
              {isSigningUp && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{isSigningUp ? 'Signing up...' : 'Sign Up'}</span>
            </button>
            <p className="text-center text-xs text-slate-500">
              Already have an account,{' '}
              <button
                type="button"
                onClick={() => {
                  setAuthView('login');
                  setSignupError(null);
                }}
                className="text-nus-blue font-bold underline"
              >
                Log in
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

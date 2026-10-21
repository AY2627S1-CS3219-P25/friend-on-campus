/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted AdminLoginPage component into src/pages/AdminLoginPage.tsx.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface AdminLoginPageProps {
  handleAdminLogin: (e: React.FormEvent) => void;
  loginError: { code: string; message: string } | null;
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPassword: string;
  setLoginPassword: (password: string) => void;
  isLoggingIn: boolean;
  rememberMe: boolean;
  setRememberMe: (remember: boolean) => void;
}

export function AdminLoginPage({
  handleAdminLogin,
  loginError,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  isLoggingIn,
  rememberMe,
  setRememberMe,
}: AdminLoginPageProps) {
  return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <form onSubmit={handleAdminLogin} className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm space-y-5">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 mx-auto rounded-lg bg-orange-500 flex items-center justify-center font-black text-white text-xl">
              A
            </div>
            <h1 className="text-lg font-bold text-slate-900">Admin Log In</h1>
            <p className="text-sm text-slate-500">NUS CampusErrand Admin Control Portal</p>
          </div>

          {loginError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm space-y-0.5">
              <p className="font-bold">{loginError.code}</p>
              <p>{loginError.message}</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={isLoggingIn}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example@nus.edu.sg"
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
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <label className="flex items-center space-x-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoggingIn}
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
            />
            <span>Keep me logged in</span>
          </label>

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-sm py-2.5 rounded-lg shadow transition"
          >
            {isLoggingIn && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>{isLoggingIn ? 'Logging in...' : 'Log In'}</span>
          </button>
          {window.location.port !== '5174' && (
            <div className="border-t border-slate-200 pt-4">
              <a
                href="/"
                className="flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-900 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
              >
                Student Log In
              </a>
            </div>
          )}
        </form>
      </div>
  );
}

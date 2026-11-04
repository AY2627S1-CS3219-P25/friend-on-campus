/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Light elegant theme update - vibrant orange CTA button, luminous brand mark gradient, accessible states.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Redesigned AuthGatePage with modern light theme, Package brand identity, vertically centered password reveal toggles, and clean campus delivery header.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted login and signup gate page from student-app App.tsx into pages/AuthGatePage.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Package,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import React, { useState } from 'react';
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
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupRetype, setShowSignupRetype] = useState(false);

  const handleFillDemo = (email: string, pass: string) => {
    setLoginEmail(email);
    setLoginPassword(pass);
    setLoginError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50/60 via-slate-50 to-orange-50/40 px-4 py-12 relative overflow-hidden">
      {/* Decorative ambient background lighting */}
      <div
        aria-hidden="true"
        className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-300/15 rounded-full blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-1/4 -right-20 w-96 h-96 bg-orange-300/15 rounded-full blur-3xl pointer-events-none"
      />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-500 text-white shadow-xl shadow-blue-500/20 border border-blue-200/60 ring-4 ring-blue-50/80 relative mb-1">
            <Package className="w-7 h-7 text-white stroke-[2.2]" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-nus-orange border-2 border-white"></span>
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight flex items-center justify-center gap-2">
            <span className="text-blue-700">NUS</span>
            <span className="text-slate-900">
              Campus<span className="text-nus-orange">Errand</span>
            </span>
          </h1>
          <p className="text-xs font-semibold text-slate-500 tracking-wide">
            Peer-to-Peer Campus Delivery
          </p>
        </div>

        {/* Main Auth Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-200/80 p-6 md:p-8 space-y-5">
          {/* Segmented Mode Selector */}
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => {
                setAuthView('login');
                setSignupError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                authView === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthView('signup');
                setLoginError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                authView === 'signup'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              New Registration
            </button>
          </div>

          {authView === 'login' ? (
            <form onSubmit={onLoginSubmit} className="space-y-4">
              {/* Evaluator Quick Demo Accounts Callout */}
              <div className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/90 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-nus-blue flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Demo Evaluator 1-Click Access
                  </span>
                  <span className="text-[10px] bg-blue-100/70 text-nus-blue font-bold px-1.5 py-0.5 rounded">
                    Auto-Fill
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFillDemo('alice@u.nus.edu', 'Password123!')}
                    className="p-2 bg-white rounded-xl border border-slate-200 hover:border-nus-blue text-left transition hover:shadow-xs group cursor-pointer"
                  >
                    <div className="flex items-center gap-1 font-black text-xs text-slate-900 group-hover:text-nus-blue">
                      <span>👤 Alice</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Requester • 73 C</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFillDemo('bob@u.nus.edu', 'Password123!')}
                    className="p-2 bg-white rounded-xl border border-slate-200 hover:border-nus-orange text-left transition hover:shadow-xs group cursor-pointer"
                  >
                    <div className="flex items-center gap-1 font-black text-xs text-slate-900 group-hover:text-nus-orange">
                      <span>⚡ Bob</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Courier • 62 C</p>
                  </button>
                </div>
              </div>

              {loginError && (
                <div
                  role="alert"
                  className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 shadow-xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <div>
                    <p className="font-bold">{loginError.code}</p>
                    <p className="mt-0.5">{loginError.message}</p>
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label htmlFor="login-email-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                  NUS Student Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="login-email-input"
                    type="email"
                    required
                    autoComplete="username"
                    placeholder="e.g. alice@u.nus.edu"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={isLoggingIn}
                    className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-nus-blue focus:border-transparent transition text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="login-password-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="login-password-input"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="Enter account password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    disabled={isLoggingIn}
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-nus-blue focus:border-transparent transition text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Keep Logged In */}
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center space-x-2 text-slate-600 cursor-pointer select-none">
                  <input
                    id="login-remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    disabled={isLoggingIn}
                    className="rounded border-slate-300 text-nus-blue focus:ring-nus-blue"
                  />
                  <span>Keep me logged in</span>
                </label>
                <span className="text-slate-400">NUS OpenID / JWT</span>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center space-x-2 bg-nus-orange hover:bg-orange-600 disabled:bg-slate-300 text-white font-bold text-sm py-3 rounded-xl shadow-sm transition-all cursor-pointer"
              >
                {isLoggingIn && <RefreshCw className="w-4 h-4 animate-spin text-white" aria-hidden="true" />}
                <span>{isLoggingIn ? 'Logging in...' : 'Log In'}</span>
              </button>

              {/* Secondary Navigation */}
              <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                <span>Staff or administrator?</span>
                <a
                  href="/admin/"
                  className="font-bold text-nus-blue hover:underline flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
                  Admin Log In
                </a>
              </div>
            </form>
          ) : (
            <form onSubmit={onSignupSubmit} className="space-y-3.5">
              {signupError && (
                <div
                  role="alert"
                  className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 shadow-xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <div>
                    <p className="font-bold">{signupError.code}</p>
                    <p className="mt-0.5">{signupError.message}</p>
                  </div>
                </div>
              )}

              {/* Username */}
              <div>
                <label htmlFor="signup-username-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                  NUS Display Username <span className="text-rose-600">*</span>
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="signup-username-input"
                    type="text"
                    required
                    maxLength={50}
                    autoComplete="username"
                    placeholder="e.g. charlie_tan"
                    value={signupData.username}
                    onChange={(e) => setSignupData({ ...signupData, username: e.target.value })}
                    disabled={isSigningUp}
                    className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-nus-blue transition text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">1–50 alphanumeric characters or underscores.</p>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="signup-email-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                  NUS Email Address <span className="text-rose-600">*</span>
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="signup-email-input"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="e.g. e1234567@u.nus.edu"
                    value={signupData.email}
                    onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                    disabled={isSigningUp}
                    className="w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-nus-blue transition text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="signup-password-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="signup-password-input"
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    maxLength={24}
                    autoComplete="new-password"
                    placeholder="8–24 characters"
                    value={signupData.password}
                    onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                    disabled={isSigningUp}
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-nus-blue transition text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Re-type Password */}
              <div>
                <label htmlFor="signup-retype-password-input" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Re-type Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    id="signup-retype-password-input"
                    type={showSignupRetype ? 'text' : 'password'}
                    required
                    minLength={8}
                    maxLength={24}
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={signupData.retypePassword}
                    onChange={(e) => setSignupData({ ...signupData, retypePassword: e.target.value })}
                    disabled={isSigningUp}
                    className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-nus-blue transition text-slate-900 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupRetype((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label={showSignupRetype ? 'Hide password' : 'Show password'}
                  >
                    {showSignupRetype ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSigningUp}
                className="w-full flex items-center justify-center space-x-2 bg-nus-orange hover:bg-orange-600 disabled:bg-slate-300 text-white font-black text-sm py-3 rounded-xl shadow-md transition-all cursor-pointer"
              >
                {isSigningUp && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>{isSigningUp ? 'Creating student profile…' : 'Complete Registration'}</span>
              </button>

              <p className="text-center text-xs text-slate-500 pt-1">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('login');
                    setSignupError(null);
                  }}
                  className="text-nus-blue font-bold underline cursor-pointer"
                >
                  Sign in here
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Rebranded auth showcase to tompang. with Friend Pin logo and authentic Singapore campus errand value proposition.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Redesigned AuthGatePage into a high-converting promotional showcase with a split desktop layout, Direction A brand identity, luminous 100 Credits Welcome Grant banner, and verified NUS campus value props while preserving all form inputs and test IDs.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Removed demo evaluator auto-fill callouts and JWT technical metadata for a sleek, formal student portal.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-06
 * Scope: Redesigned AuthGatePage with modern glassmorphic card layout, luminous brand crest with pulsing live indicator, tactile demo user chips, and preserved form IDs and aria labels.
 * Author review: <to be completed by yanhwee>
 *
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
  Coins,
  Eye,
  EyeOff,
  Gift,
  Lock,
  Mail,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import React, { useState } from 'react';
import { FriendPinLogo } from '../components/FriendPinLogo';
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50/70 via-slate-50 to-orange-50/50 px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* Decorative ambient background lighting */}
      <div
        aria-hidden="true"
        className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-300/15 rounded-full blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-1/4 -right-20 w-96 h-96 bg-orange-300/15 rounded-full blur-3xl pointer-events-none"
      />

      <div className="w-full max-w-5xl relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Brand & Promotional Showcase */}
          <div className="lg:col-span-7 space-y-6 sm:space-y-7">
            {/* Brand Logo (Friend Pin + tompang.) */}
            <div className="flex items-center gap-3.5">
              <FriendPinLogo className="w-12 h-12 rounded-2xl shadow-lg shadow-blue-500/20 shrink-0" />
              <div>
                <h1 className="text-3xl font-black tracking-tight leading-none text-slate-900">
                  tompang<span className="text-nus-orange">.</span>
                </h1>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  by Friend on Campus (FoC) · NUS Peer Errand Network
                </p>
              </div>
            </div>

            {/* Pitch & Value Headline */}
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Your campus errands, <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-nus-blue via-indigo-600 to-nus-orange bg-clip-text text-transparent">
                  tompang with friends.
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg">
                Need a meal from The Deck or printed notes brought to your study bench?
                Connect with coursemates already heading your way across Kent Ridge campus.
              </p>
            </div>

            {/* Promotional 100 Credits Welcome Grant Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white border border-amber-200/80 p-5 sm:p-6 shadow-sm">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-nus-orange to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/20">
                  <Gift className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider text-nus-orange bg-orange-100/90 border border-orange-200/60">
                    <Sparkles className="w-3 h-3 text-nus-orange" />
                    <span>Welcome Promotion</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900">
                    Claim 100 Free Credits on Sign Up!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    Every new student gets 100 credits automatically credited upon registration. Use them to request your first campus errand or start earning by fulfilling errands on the way to class.
                  </p>
                </div>
              </div>
            </div>

            {/* Community Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs space-y-1">
                <div className="flex items-center gap-2 text-nus-blue font-bold text-xs">
                  <MapPin className="w-4 h-4 shrink-0 text-nus-blue" />
                  <span>Kent Ridge Hubs</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  UTown, COM3, Science, The Deck, PGPR & more.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs space-y-1">
                <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Escrow Protected</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Credits released only after delivery is confirmed.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-200/80 shadow-2xs space-y-1">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
                  <Coins className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Zero Cash Hassle</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Seamless student credit exchange and rewards.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Main Auth Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto lg:max-w-none">
            <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-200/90 p-6 sm:p-8 space-y-5">
              {/* Segmented Mode Selector */}
              <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => {
                    setAuthView('login');
                    setSignupError(null);
                  }}
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition cursor-pointer ${
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
                  className={`flex-1 py-2 text-xs font-black rounded-xl transition cursor-pointer ${
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
                  {loginError && (
                    <div
                      role="alert"
                      className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2 shadow-xs"
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
                        className="w-full pl-10 pr-3 py-2.5 text-sm rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-nus-blue focus:border-transparent transition text-slate-900 placeholder:text-slate-400 shadow-inner"
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
                        className="w-full pl-10 pr-10 py-2.5 text-sm rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-nus-blue focus:border-transparent transition text-slate-900 placeholder:text-slate-400 shadow-inner"
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
                      <span className="font-medium">Keep me logged in</span>
                    </label>
                    <span className="text-slate-400 font-medium">Single Sign-On (SSO)</span>
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-nus-orange to-orange-500 hover:from-orange-600 hover:to-orange-500 disabled:opacity-50 text-white font-black text-sm py-3.5 rounded-2xl shadow-md hover:shadow-lg hover:shadow-orange-500/20 transition-all cursor-pointer active:scale-[0.99]"
                  >
                    {isLoggingIn && <RefreshCw className="w-4 h-4 animate-spin text-white" aria-hidden="true" />}
                    <span>{isLoggingIn ? 'Logging in...' : 'Log In'}</span>
                  </button>

                  {/* Secondary Navigation */}
                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium">Staff or administrator?</span>
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
                      className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2 shadow-xs"
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
                        className="w-full pl-10 pr-3 py-2.5 text-sm rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-nus-blue transition text-slate-900 placeholder:text-slate-400 shadow-inner"
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
                        className="w-full pl-10 pr-3 py-2.5 text-sm rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-nus-blue transition text-slate-900 placeholder:text-slate-400 shadow-inner"
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
                        className="w-full pl-10 pr-10 py-2.5 text-sm rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-nus-blue transition text-slate-900 placeholder:text-slate-400 shadow-inner"
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
                        className="w-full pl-10 pr-10 py-2.5 text-sm rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-nus-blue transition text-slate-900 placeholder:text-slate-400 shadow-inner"
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
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-nus-orange to-orange-500 hover:from-orange-600 hover:to-orange-500 disabled:opacity-50 text-white font-black text-sm py-3.5 rounded-2xl shadow-md hover:shadow-lg hover:shadow-orange-500/20 transition-all cursor-pointer active:scale-[0.99]"
                  >
                    {isSigningUp && <RefreshCw className="w-4 h-4 animate-spin text-white" />}
                    <span>{isSigningUp ? 'Creating student profile…' : 'Complete Registration'}</span>
                  </button>

                  <p className="text-center text-xs text-slate-500 pt-1 font-medium">
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
      </div>
    </div>
  );
}

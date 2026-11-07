/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Removed technical meta information (WS Hub) in favor of a sleek, formal Live network indicator with data-status attributes.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-06
 * Scope: Redesigned HeaderNav with premium glassmorphism, animated pulse indicators, interactive tab pills, and refined wallet capsule.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Styled HeaderNav active tabs, profile button, and wallet capsule in light elegant aesthetic without dark button colors.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Redesigned HeaderNav to compact single-row frosted layout, inline WS Hub indicator, unified mobile/desktop alerts, and removed duplicate escrow subline.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted top header navigation bar and status bar from student-app App.tsx into components/HeaderNav.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { CreditWalletDTO } from '@campus-errand/common-dtos';
import {
  Clock,
  Coins,
  Compass,
  Lock,
  Package,
  PlusCircle,
  Store,
  UserCircle,
} from 'lucide-react';
import { NotificationBell } from '../notifications/NotificationBell';

export type StudentTab = 'feed' | 'post' | 'spots' | 'tasks' | 'alerts' | 'profile' | 'wallet';

interface HeaderNavProps {
  activeTab: StudentTab;
  onSelectTab: (tab: StudentTab) => void;
  onOpenProfile: () => void;
  unreadNotificationsCount: number;
  wallet: CreditWalletDTO | null;
  isLoadingCredits: boolean;
  showWsStatus: boolean;
  wsStatus: string;
}

export function HeaderNav({
  activeTab,
  onSelectTab,
  onOpenProfile,
  unreadNotificationsCount,
  wallet,
  isLoadingCredits,
  showWsStatus,
  wsStatus,
}: HeaderNavProps) {
  return (
    <header className="bg-white/90 backdrop-blur-xl text-slate-800 px-4 py-2.5 md:py-3 md:px-6 lg:px-8 sticky top-0 z-30 shadow-subtle border-b border-slate-200/80 transition-all">
      <div className="student-header-row max-w-7xl mx-auto">
        {/* Brand, Student Badge & Inline Live Hub */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => onSelectTab('feed')}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
            aria-label="CampusErrand Home"
          >
            <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-br from-nus-blue via-indigo-600 to-nus-blue-dark flex items-center justify-center text-white shadow-card group-hover:scale-105 group-hover:shadow-glow-blue transition-all duration-200 shrink-0">
              <Package className="w-5 h-5 text-white stroke-[2.2]" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-nus-orange ring-2 ring-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm md:text-base tracking-tight text-slate-900 group-hover:text-nus-blue transition-colors">
                  <span className="text-nus-blue">NUS</span> Campus<span className="text-nus-orange">Errand</span>
                </span>
                <span className="bg-nus-orange-50 text-nus-orange border border-nus-orange-200 text-[10px] font-black px-2 py-0.5 rounded-full tracking-wider shadow-2xs">
                  STUDENT
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                  Peer-to-Peer Campus Delivery
                </p>
                {showWsStatus && (
                  <span
                    data-testid="ws-status"
                    data-status={wsStatus}
                    className="inline-flex items-center gap-1.5 text-[10px] text-slate-600 font-semibold bg-slate-100/90 px-2.5 py-0.5 rounded-full border border-slate-200/80 shadow-2xs"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        wsStatus === 'connected'
                          ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)] animate-pulse'
                          : wsStatus === 'connecting'
                          ? 'bg-amber-500 animate-ping'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span>{wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? 'Connecting…' : 'Offline'}</span>
                    <span className="sr-only">WS Hub: {wsStatus}</span>
                  </span>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Desktop Top Navigation Bar (Errand Workspace) */}
        <nav
          aria-label="Main navigation"
          className="student-top-nav hidden md:flex items-center gap-1 bg-slate-100/90 rounded-2xl p-1 border border-slate-200/80 shadow-2xs"
        >
          <button
            aria-current={activeTab === 'feed' ? 'page' : undefined}
            onClick={() => onSelectTab('feed')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
              activeTab === 'feed'
                ? 'bg-white text-nus-blue shadow-sm border border-slate-200/60 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Feed</span>
          </button>

          <button
            aria-current={activeTab === 'post' ? 'page' : undefined}
            onClick={() => onSelectTab('post')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
              activeTab === 'post'
                ? 'bg-white text-nus-blue shadow-sm border border-slate-200/60 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Post</span>
          </button>

          <button
            aria-current={activeTab === 'spots' ? 'page' : undefined}
            onClick={() => onSelectTab('spots')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
              activeTab === 'spots'
                ? 'bg-white text-nus-blue shadow-sm border border-slate-200/60 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Store className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Spots</span>
          </button>

          <button
            aria-current={activeTab === 'tasks' ? 'page' : undefined}
            onClick={() => onSelectTab('tasks')}
            className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-white text-nus-blue shadow-sm border border-slate-200/60 scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Tasks</span>
          </button>
        </nav>

        {/* Right Section: Personal Account & Financial Hub */}
        <div className="flex items-center gap-2">
          {/* Alerts Bell (Desktop only; on mobile it lives in the ergonomic bottom dock) */}
          <div className="hidden md:flex">
            <NotificationBell
              variant="top"
              unreadCount={unreadNotificationsCount}
              active={activeTab === 'alerts'}
              onClick={() => onSelectTab('alerts')}
            />
          </div>

          {/* Interactive Wallet Balance Capsule */}
          <button
            type="button"
            aria-label="Open wallet"
            aria-current={activeTab === 'wallet' ? 'page' : undefined}
            onClick={() => onSelectTab('wallet')}
            className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all duration-150 cursor-pointer ${
              activeTab === 'wallet'
                ? 'bg-amber-50/90 border-amber-300 text-slate-900 shadow-sm ring-2 ring-amber-300/40'
                : 'bg-white hover:bg-amber-50/40 border-slate-200/90 hover:border-amber-200 text-slate-800 shadow-subtle hover:shadow-card'
            }`}
          >
            <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
              <Coins className="w-3.5 h-3.5 text-amber-600 fill-amber-200" />
            </div>
            <div className="flex flex-col text-left leading-none">
              <span className="text-xs font-black text-slate-900" aria-live="polite">
                {wallet
                  ? `${wallet.availableCredits} C`
                  : isLoadingCredits
                  ? 'Loading…'
                  : '0 C'}
              </span>
              {wallet && wallet.escrowCredits > 0 && (
                <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-0.5 mt-0.5">
                  <Lock className="w-2.5 h-2.5 text-amber-500" />
                  {wallet.escrowCredits} held
                </span>
              )}
            </div>
          </button>

          {/* Profile Button (Desktop only; on mobile it lives in the bottom dock) */}
          <button
            type="button"
            aria-current={activeTab === 'profile' ? 'page' : undefined}
            onClick={onOpenProfile}
            className={`hidden md:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer border ${
              activeTab === 'profile'
                ? 'bg-nus-blue text-white border-nus-blue shadow-sm'
                : 'bg-white text-slate-700 border-slate-200/80 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-subtle hover:shadow-card'
            }`}
          >
            <UserCircle className="w-4 h-4 text-slate-500 group-hover:text-slate-700" />
            <span>Profile</span>
          </button>
        </div>
      </div>
    </header>
  );
}

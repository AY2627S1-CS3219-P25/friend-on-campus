/**
 * AI Assistance Disclosure:
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
    <header className="bg-white/95 backdrop-blur-md text-slate-800 px-4 py-2.5 md:py-3 md:px-6 lg:px-8 sticky top-0 z-30 shadow-xs border-b border-slate-200/90">
      <div className="student-header-row">
        {/* Brand, Student Badge & Inline Live Hub */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => onSelectTab('feed')}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
            aria-label="CampusErrand Home"
          >
            <div className="relative w-8 h-8 rounded-xl bg-nus-blue flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <Package className="w-4 h-4 text-white" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-nus-orange ring-2 ring-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm md:text-base tracking-tight text-slate-900">
                  <span className="text-nus-blue">NUS</span> Campus<span className="text-nus-orange">Errand</span>
                </span>
                <span className="bg-orange-50 text-nus-orange border border-orange-200/80 text-[10px] font-black px-1.5 py-0.5 rounded-full tracking-wider">
                  STUDENT
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                  Peer-to-Peer Campus Delivery
                </p>
                {showWsStatus && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        wsStatus === 'connected'
                          ? 'bg-emerald-500 motion-safe:animate-pulse'
                          : wsStatus === 'connecting'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span>WS Hub: {wsStatus}</span>
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
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'feed'
                ? 'bg-nus-blue text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Feed</span>
          </button>

          <button
            aria-current={activeTab === 'post' ? 'page' : undefined}
            onClick={() => onSelectTab('post')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'post'
                ? 'bg-nus-blue text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Post</span>
          </button>

          <button
            aria-current={activeTab === 'spots' ? 'page' : undefined}
            onClick={() => onSelectTab('spots')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'spots'
                ? 'bg-nus-blue text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Spots</span>
          </button>

          <button
            aria-current={activeTab === 'tasks' ? 'page' : undefined}
            onClick={() => onSelectTab('tasks')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-nus-blue text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
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
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'wallet'
                ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs ring-2 ring-amber-300/40'
                : 'bg-amber-50/80 border-amber-200/80 hover:bg-amber-100/70 hover:border-amber-300 text-amber-900 shadow-2xs'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col text-left leading-none">
              <span className="text-xs font-black text-amber-900" aria-live="polite">
                {wallet
                  ? `${wallet.availableCredits} C`
                  : isLoadingCredits
                  ? 'Loading…'
                  : '0 C'}
              </span>
              {wallet && wallet.escrowCredits > 0 && (
                <span className="text-[10px] text-amber-700/80 flex items-center gap-0.5 mt-0.5 font-medium">
                  <Lock className="w-2.5 h-2.5" />
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
            className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'profile'
                ? 'bg-nus-blue text-white border-nus-blue shadow-xs'
                : 'bg-white text-slate-700 border-slate-200/80 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
            }`}
          >
            <UserCircle className="w-4 h-4" />
            <span>Profile</span>
          </button>
        </div>
      </div>
    </header>
  );
}

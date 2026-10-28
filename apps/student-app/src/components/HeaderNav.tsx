/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Redesigned HeaderNav with modern frosted-glass bar, inline WebSocket status chip, and transparent credit wallet chip.
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
  GraduationCap,
  Lock,
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
    <header className="bg-[#002855]/95 backdrop-blur-md text-white px-4 py-3 md:px-6 lg:px-8 sticky top-0 z-30 shadow-md border-b border-white/10">
      <div className="student-header-row">
        {/* Brand and Live Indicator */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSelectTab('feed')}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
            aria-label="CampusErrand Home"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-nus-blue to-blue-600 flex items-center justify-center text-white border border-white/20 shadow-xs group-hover:scale-105 transition-transform">
              <GraduationCap className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm md:text-base tracking-tight text-white">
                  NUS CampusErrand
                </span>
                <span className="bg-nus-orange text-xs font-black px-1.5 py-0.5 rounded tracking-normal text-white">
                  STUDENT
                </span>
              </div>
              <p className="text-[11px] text-blue-200/80 hidden sm:block">
                Peer-to-Peer Campus Delivery
              </p>
            </div>
          </button>
        </div>

        {/* Desktop Top Navigation Bar */}
        <nav
          aria-label="Main navigation"
          className="student-top-nav hidden md:flex items-center gap-1 bg-blue-950/50 rounded-2xl p-1 border border-blue-400/20"
        >
          <button
            aria-current={activeTab === 'feed' ? 'page' : undefined}
            onClick={() => onSelectTab('feed')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'feed'
                ? 'bg-nus-orange text-white shadow-xs'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Feed</span>
          </button>

          <button
            aria-current={activeTab === 'post' ? 'page' : undefined}
            onClick={() => onSelectTab('post')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'post'
                ? 'bg-nus-orange text-white shadow-xs'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Post</span>
          </button>

          <button
            aria-current={activeTab === 'spots' ? 'page' : undefined}
            onClick={() => onSelectTab('spots')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'spots'
                ? 'bg-nus-orange text-white shadow-xs'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Spots</span>
          </button>

          <button
            aria-current={activeTab === 'tasks' ? 'page' : undefined}
            onClick={() => onSelectTab('tasks')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'tasks'
                ? 'bg-nus-orange text-white shadow-xs'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Tasks</span>
          </button>

          <button
            aria-current={activeTab === 'profile' ? 'page' : undefined}
            onClick={onOpenProfile}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-nus-orange text-white shadow-xs'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <UserCircle className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>

          <NotificationBell
            variant="top"
            unreadCount={unreadNotificationsCount}
            active={activeTab === 'alerts'}
            onClick={() => onSelectTab('alerts')}
          />
        </nav>

        {/* Right Section: Interactive Wallet Button & Secondary Status */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Open wallet"
            aria-current={activeTab === 'wallet' ? 'page' : undefined}
            onClick={() => onSelectTab('wallet')}
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'wallet'
                ? 'bg-amber-400/20 border-amber-300 text-amber-200 shadow-sm'
                : 'bg-blue-950/60 border-blue-400/30 hover:border-amber-400/60 hover:bg-blue-900/80 text-white'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col text-left leading-none">
              <span className="text-xs font-black text-amber-300" aria-live="polite">
                {wallet
                  ? `${wallet.availableCredits} C`
                  : isLoadingCredits
                  ? 'Loading…'
                  : '0 C'}
              </span>
              {wallet && wallet.escrowCredits > 0 && (
                <span className="text-[10px] text-blue-200/80 flex items-center gap-0.5 mt-0.5">
                  <Lock className="w-2.5 h-2.5" />
                  {wallet.escrowCredits} held
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Real-time WebSocket connection and escrow subline */}
      <div className="mt-2.5 pt-2 border-t border-blue-800/60 flex justify-between items-center text-xs">
        {showWsStatus ? (
          <span className="flex items-center space-x-1.5 text-blue-200">
            <span
              className={`w-2 h-2 rounded-full ${
                wsStatus === 'connected'
                  ? 'bg-emerald-400 motion-safe:animate-pulse'
                  : wsStatus === 'connecting'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span>WS Hub: {wsStatus}</span>
          </span>
        ) : (
          <span />
        )}
        <span className="text-blue-300">
          Escrow: {wallet ? `${wallet.escrowCredits} C Held` : '—'}
        </span>
      </div>
    </header>
  );
}

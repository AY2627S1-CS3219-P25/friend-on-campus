/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted top header navigation bar and status bar from student-app App.tsx into components/HeaderNav.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { CreditWalletDTO } from '@campus-errand/common-dtos';
import { Clock, Coins, Compass, PlusCircle, Store, UserCircle } from 'lucide-react';
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
    <header className="bg-nus-blue text-white px-4 py-4 md:px-6 lg:px-8 sticky top-0 z-30 shadow-md">
      <div className="student-header-row">
        <div>
          <h1 className="font-extrabold text-base tracking-tight flex flex-wrap items-center gap-1.5">
            <span>NUS CampusErrand</span>
            <span className="bg-nus-orange text-xs font-black px-1.5 py-0.5 rounded tracking-normal">
              STUDENT
            </span>
          </h1>
          <p className="text-xs text-blue-200">Dual-Role Peer Network • Milestone 3</p>
        </div>

        {/* AI-generated (edited by jagdeepsh) - desktop top nav bar, replaces the bottom tab bar at md: and up */}
        <nav
          aria-label="Main navigation"
          className="student-top-nav hidden md:flex flex-wrap items-center gap-1 bg-blue-900/40 rounded-2xl px-1.5 py-1 border border-blue-400/20"
        >
          <button
            aria-current={activeTab === 'feed' ? 'page' : undefined}
            onClick={() => onSelectTab('feed')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition ${
              activeTab === 'feed'
                ? 'bg-nus-orange text-white shadow-sm'
                : 'text-blue-200 hover:text-white hover:bg-blue-800/60'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Feed</span>
          </button>

          <button
            aria-current={activeTab === 'post' ? 'page' : undefined}
            onClick={() => onSelectTab('post')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition ${
              activeTab === 'post'
                ? 'bg-nus-orange text-white shadow-sm'
                : 'text-blue-200 hover:text-white hover:bg-blue-800/60'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Post</span>
          </button>

          <button
            aria-current={activeTab === 'spots' ? 'page' : undefined}
            onClick={() => onSelectTab('spots')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition ${
              activeTab === 'spots'
                ? 'bg-nus-orange text-white shadow-sm'
                : 'text-blue-200 hover:text-white hover:bg-blue-800/60'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Spots</span>
          </button>

          <button
            aria-current={activeTab === 'tasks' ? 'page' : undefined}
            onClick={() => onSelectTab('tasks')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition ${
              activeTab === 'tasks'
                ? 'bg-nus-orange text-white shadow-sm'
                : 'text-blue-200 hover:text-white hover:bg-blue-800/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Tasks</span>
          </button>

          <button
            aria-current={activeTab === 'profile' ? 'page' : undefined}
            onClick={onOpenProfile}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition ${
              activeTab === 'profile'
                ? 'bg-nus-orange text-white shadow-sm'
                : 'text-blue-200 hover:text-white hover:bg-blue-800/60'
            }`}
          >
            <UserCircle className="w-4 h-4" />
            <span>Profile</span>
          </button>
          <NotificationBell
            variant="top"
            unreadCount={unreadNotificationsCount}
            active={activeTab === 'alerts'}
            onClick={() => onSelectTab('alerts')}
          />
        </nav>

        <button
          type="button"
          aria-label="Open wallet"
          aria-current={activeTab === 'wallet' ? 'page' : undefined}
          onClick={() => onSelectTab('wallet')}
          className="flex items-center space-x-1 bg-blue-900/60 px-2.5 py-1 rounded-full border border-blue-400/30 hover:bg-blue-800 transition"
        >
          <Coins className="w-3.5 h-3.5 text-amber-300" />
          <span className="text-sm font-bold text-amber-300" aria-live="polite">
            {wallet
              ? `${wallet.availableCredits} C`
              : isLoadingCredits
              ? 'Loading credits…'
              : 'Credits unavailable'}
          </span>
        </button>
      </div>

      {/* Status Line */}
      <div className="mt-2.5 pt-2 border-t border-blue-800 flex justify-between items-center text-xs">
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

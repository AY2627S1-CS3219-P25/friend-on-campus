/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6); Google Antigravity Agent, date: 2026-10-19 to 2026-11-07
 * Scope: Extracted top header navigation bar and status bar from student-app App.tsx into components/HeaderNav.tsx; updated across 25 AI-assisted revisions through D4 wrap-up (keep the full product name on one line at every viewport width and compact phone utilities to fit).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */


import { CreditWalletDTO } from '@campus-errand/common-dtos';
import {
  Clock,
  Coins,
  Compass,
  PlusCircle,
  Store,
  UserCircle,
} from 'lucide-react';
import { FriendOnCampusLogo } from './FriendOnCampusLogo';
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
    <header className="bg-white/95 backdrop-blur-md text-slate-800 px-3.5 py-2 sm:px-6 md:py-2.5 lg:px-8 sticky top-0 z-30 shadow-subtle border-b border-slate-200/80 transition-all">
      <div className="student-header-row max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Cluster: Brand + Divider + Primary Browsing Tabs (Option A) */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-3 xl:gap-6">
          <button
            type="button"
            onClick={() => onSelectTab('feed')}
            className="flex shrink-0 items-center gap-1.5 sm:gap-2.5 text-left focus:outline-none group cursor-pointer"
            aria-label="Friend on Campus Home"
          >
            <FriendOnCampusLogo className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 transition-transform duration-200 group-hover:-rotate-6" />
            <div>
              <div className="flex items-baseline gap-1 sm:gap-1.5">
                <span className="brand-wordmark whitespace-nowrap text-sm sm:text-lg xl:text-xl leading-tight">
                  <span>Friend <span className="brand-connector">on</span></span>{' '}
                  <span>Campus</span>
                </span>
                {showWsStatus && (
                  <span
                    data-testid="ws-status"
                    data-status={wsStatus}
                    className="sr-only"
                  >
                    WS Hub: {wsStatus}
                  </span>
                )}
              </div>
            </div>
          </button>

          {/* Subtle vertical divider between Brand and Primary Nav (desktop only) */}
          <div className="hidden lg:block h-6 w-px bg-slate-200/90" aria-hidden="true" />

          {/* Desktop Top Navigation Bar (Errand Workspace, Left-Aligned) */}
          <nav
            aria-label="Main navigation"
            className="student-top-nav hidden lg:flex items-center gap-1 rounded-xl p-1"
          >
            <button
              aria-current={activeTab === 'feed' ? 'page' : undefined}
              onClick={() => onSelectTab('feed')}
              className={`flex items-center space-x-1.5 h-11 min-h-0 px-3 xl:px-3.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                activeTab === 'feed'
                  ? 'bg-campus-blue-soft text-campus-blue'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Compass className="w-4 h-4 stroke-[2.2]" />
              <span>Browse</span>
            </button>

            <button
              aria-current={activeTab === 'spots' ? 'page' : undefined}
              onClick={() => onSelectTab('spots')}
              className={`flex items-center space-x-1.5 h-11 min-h-0 px-3 xl:px-3.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                activeTab === 'spots'
                  ? 'bg-campus-blue-soft text-campus-blue'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Store className="w-4 h-4 stroke-[2.2]" />
              <span>Places</span>
            </button>

            <button
              aria-current={activeTab === 'tasks' ? 'page' : undefined}
              onClick={() => onSelectTab('tasks')}
              className={`flex items-center space-x-1.5 h-11 min-h-0 px-3 xl:px-3.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-campus-blue-soft text-campus-blue'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Clock className="w-4 h-4 stroke-[2.2]" />
              <span>My Errands</span>
            </button>
          </nav>
        </div>

        {/* Right Section: Primary Actions & Compact Personal Hub (Option A) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Desktop Primary Action CTA: Post Errand */}
          <button
            type="button"
            aria-label="Post errand"
            aria-current={activeTab === 'post' ? 'page' : undefined}
            onClick={() => onSelectTab('post')}
            className={`hidden lg:inline-flex items-center space-x-1.5 h-11 min-h-0 px-4 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer shadow-xs active:scale-95 ${
              activeTab === 'post'
                ? 'bg-campus-coral-hover text-campus-ink ring-2 ring-orange-200'
                : 'bg-campus-coral hover:bg-campus-coral-hover text-campus-ink'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 stroke-[2.4]" />
            <span>Post errand</span>
          </button>

          <div className="hidden lg:block h-5 w-px bg-slate-200 mx-0.5" aria-hidden="true" />

          {/* Interactive Wallet Balance Capsule (Available Spendable Balance) */}
          <button
            type="button"
            aria-label="Open wallet"
            aria-current={activeTab === 'wallet' ? 'page' : undefined}
            onClick={() => onSelectTab('wallet')}
            className={`group flex items-center gap-1.5 sm:gap-2 h-11 min-h-0 px-2.5 sm:px-3 rounded-xl border transition-all duration-150 cursor-pointer ${
              activeTab === 'wallet'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-white hover:bg-amber-50/40 border-slate-200/90 hover:border-amber-200 text-slate-800 shadow-subtle hover:shadow-card'
            }`}
          >
            <div
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg hidden min-[400px]:flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 ${
                activeTab === 'wallet' ? 'bg-amber-100' : 'bg-amber-50'
              }`}
            >
              <Coins
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                  activeTab === 'wallet' ? 'text-amber-700' : 'text-amber-600'
                }`}
              />
            </div>
            <span
              className={`text-xs sm:text-sm font-semibold tracking-tight ${
                activeTab === 'wallet' ? 'text-amber-900' : 'text-slate-900'
              }`}
              aria-live="polite"
            >
              {/* Keep the balance compact on phones and explicit on desktop. */}
              {wallet || !isLoadingCredits ? (
                <>
                  {wallet?.availableCredits ?? 0}
                  <span className="lg:hidden"> C</span>
                  <span className="hidden lg:inline"> credits</span>
                </>
              ) : 'Loading…'}
            </span>
          </button>

          {/* Alerts Bell (Visible on both mobile and desktop) */}
          <div className="flex">
            <NotificationBell
              variant="top"
              unreadCount={unreadNotificationsCount}
              active={activeTab === 'alerts'}
              onClick={() => onSelectTab('alerts')}
            />
          </div>

          {/* Profile Button (Desktop compact icon button with accessible name) */}
          <button
            type="button"
            aria-label="Profile"
            title="Profile"
            aria-current={activeTab === 'profile' ? 'page' : undefined}
            onClick={onOpenProfile}
            className={`group hidden lg:flex items-center justify-center h-11 w-11 min-h-0 rounded-xl transition-all duration-150 cursor-pointer border ${
              activeTab === 'profile'
                ? 'bg-campus-blue-soft text-campus-blue border-blue-200 ring-2 ring-blue-500/10 shadow-2xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 shadow-subtle hover:shadow-card'
            }`}
          >
            <UserCircle className={`w-5 h-5 transition-colors ${activeTab === 'profile' ? 'text-campus-blue' : 'text-slate-600 group-hover:text-slate-800'}`} />
            <span className="sr-only">Profile</span>
          </button>
        </div>
      </div>

      {/* Discreet Reconnecting / Offline Notice (Visible only when socket is not connected) */}
      {showWsStatus && wsStatus !== 'connected' && (
        <div
          role="status"
          className={`-mx-3.5 sm:-mx-6 lg:-mx-8 -mb-2 sm:-mb-3 mt-2 py-1 px-4 text-xs font-semibold text-center flex items-center justify-center gap-2 border-t transition-all ${
            wsStatus === 'connecting'
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              wsStatus === 'connecting' ? 'bg-amber-500 animate-ping' : 'bg-rose-500'
            }`}
          />
          <span>
            {wsStatus === 'connecting'
              ? 'Connecting to live errand updates…'
              : 'Offline. Reconnecting to campus network…'}
          </span>
        </div>
      )}
    </header>
  );
}

/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Implemented Direction B (Crisp Modern Canvas) theme in HeaderNav: updated brand logo styling to crisp floating canvas with subtle border and sleek hover states.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Harmonized HeaderNav with Direction A Warm Campus Mango theme: updated brand hover to warm glow, unified desktop active nav indicators with mobile bottom bar's vibrant orange accent, and refreshed mobile FoC badge.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Rebranded navbar identity to tompang. with Friend Pin logo, featuring 'by Friend on Campus' (FoC) brand signature and responsive badge.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Implemented Direction A clean modern tech brand identity: removed confusing blinking pulse badge from package icon, unified brand typography to NUS Blue and Slate-900 with signature orange accent dot, and removed subtitle for compact 48px header height.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Illuminated wallet capsule with vibrant amber active state in top header when activeTab === 'wallet', matching NotificationBell's active treatment for instant user orientation.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Refined desktop profile button active styling with soft tinted blue background, accessible contrast, and subtle ring focus, eliminating harsh dark navy fill.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Renamed Tasks navigation item to My Errands for natural user mental model and consistent errand vocabulary.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Implemented Option A (Left-Aligned Unified Nav + Compact Right Utilities): anchored primary browsing nav tabs next to brand logo, streamlined right cluster with prominent Post CTA, spendable wallet capsule, and compact icon-only alerts and profile buttons.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Implemented Option B (Silent when connected, warning banner when disconnected) for WebSocket status, removing persistent Live badge from header while preserving test locators and providing discreet top alert on disconnection.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Removed redundant STUDENT badge from brand header for clean, minimal consumer presentation.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Refined PC desktop top nav to Marketplace Pattern (Approach 1): left nav pure browsing (Feed, Spots, Tasks), right cluster hero Post CTA and unified personal hub.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Polished mobile header to single-row alignment: integrated inline Live indicator, balanced h-9 utility buttons, and eliminated orphan sub-badge.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Streamlined header wallet capsule to show spendable available balance only, moving held funds breakdown exclusively to the wallet screen.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Harmonized desktop Post action as a prominent CTA pill alongside browsing tabs (Feed, Spots, Tasks).
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Moved Alerts notification bell to universal header presentation across both mobile and desktop views.
 * Author review: <to be completed by yanhwee>
 *
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
  PlusCircle,
  Store,
  UserCircle,
} from 'lucide-react';
import { FriendPinLogo } from './FriendPinLogo';
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
    <header className="bg-white/90 backdrop-blur-xl text-slate-800 px-3.5 py-2 sm:px-6 md:py-2.5 lg:px-8 sticky top-0 z-30 shadow-subtle border-b border-slate-200/80 transition-all">
      <div className="student-header-row max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Cluster: Brand + Divider + Primary Browsing Tabs (Option A) */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
          <button
            type="button"
            onClick={() => onSelectTab('feed')}
            className="flex items-center gap-2 sm:gap-2.5 text-left focus:outline-none group cursor-pointer"
            aria-label="tompang Home"
          >
            <FriendPinLogo className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl shadow-subtle group-hover:scale-105 group-hover:shadow-card transition-all duration-200 shrink-0" />
            <div>
              <div className="flex items-baseline gap-1 sm:gap-1.5">
                <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 group-hover:text-nus-orange transition-colors">
                  tompang<span className="text-nus-orange">.</span>
                </span>
                <span className="hidden sm:inline-block text-[11px] font-bold text-slate-400 tracking-tight">
                  by Friend on Campus
                </span>
                <span className="sm:hidden text-[9px] font-bold text-orange-600 bg-orange-50 px-1 py-0.5 rounded border border-orange-200/60">
                  FoC
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
          <div className="hidden md:block h-6 w-px bg-slate-200/90" aria-hidden="true" />

          {/* Desktop Top Navigation Bar (Errand Workspace, Left-Aligned) */}
          <nav
            aria-label="Main navigation"
            className="student-top-nav hidden md:flex items-center gap-1 bg-slate-100/90 rounded-2xl p-1 border border-slate-200/80 shadow-2xs"
          >
            <button
              aria-current={activeTab === 'feed' ? 'page' : undefined}
              onClick={() => onSelectTab('feed')}
              className={`flex items-center space-x-1.5 h-8 min-h-0 px-3.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'feed'
                  ? 'bg-white text-orange-600 shadow-sm border border-slate-200/60 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Compass className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Feed</span>
            </button>

            <button
              aria-current={activeTab === 'spots' ? 'page' : undefined}
              onClick={() => onSelectTab('spots')}
              className={`flex items-center space-x-1.5 h-8 min-h-0 px-3.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'spots'
                  ? 'bg-white text-orange-600 shadow-sm border border-slate-200/60 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Store className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Spots</span>
            </button>

            <button
              aria-current={activeTab === 'tasks' ? 'page' : undefined}
              onClick={() => onSelectTab('tasks')}
              className={`flex items-center space-x-1.5 h-8 min-h-0 px-3.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-white text-orange-600 shadow-sm border border-slate-200/60 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>My Errands</span>
            </button>
          </nav>
        </div>

        {/* Right Section: Primary Actions & Compact Personal Hub (Option A) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Desktop Primary Action CTA: Post Errand */}
          <button
            type="button"
            aria-label="Post"
            aria-current={activeTab === 'post' ? 'page' : undefined}
            onClick={() => onSelectTab('post')}
            className={`hidden md:inline-flex items-center space-x-1.5 h-9 min-h-0 px-3.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-xs active:scale-95 ${
              activeTab === 'post'
                ? 'bg-gradient-to-r from-nus-orange to-orange-500 text-white shadow-orange-500/25 ring-2 ring-orange-200 scale-[1.02]'
                : 'bg-nus-orange hover:bg-orange-600 text-white shadow-orange-500/15 hover:shadow-sm'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 stroke-[2.4]" />
            <span>Post</span>
          </button>

          <div className="hidden md:block h-5 w-px bg-slate-200 mx-0.5" aria-hidden="true" />

          {/* Interactive Wallet Balance Capsule (Available Spendable Balance) */}
          <button
            type="button"
            aria-label="Open wallet"
            aria-current={activeTab === 'wallet' ? 'page' : undefined}
            onClick={() => onSelectTab('wallet')}
            className={`group flex items-center gap-1.5 sm:gap-2 h-9 min-h-0 px-2.5 sm:px-3 rounded-xl border transition-all duration-150 cursor-pointer ${
              activeTab === 'wallet'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-600 text-white shadow-xs'
                : 'bg-white hover:bg-amber-50/40 border-slate-200/90 hover:border-amber-200 text-slate-800 shadow-subtle hover:shadow-card'
            }`}
          >
            <div
              className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 ${
                activeTab === 'wallet' ? 'bg-white/20' : 'bg-amber-100'
              }`}
            >
              <Coins
                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                  activeTab === 'wallet' ? 'text-white fill-white/80' : 'text-amber-600 fill-amber-200'
                }`}
              />
            </div>
            <span
              className={`text-xs font-black tracking-tight ${
                activeTab === 'wallet' ? 'text-white' : 'text-slate-900'
              }`}
              aria-live="polite"
            >
              {wallet
                ? `${wallet.availableCredits} C`
                : isLoadingCredits
                ? 'Loading…'
                : '0 C'}
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
            className={`group hidden md:flex items-center justify-center h-9 w-9 min-h-0 rounded-xl transition-all duration-150 cursor-pointer border ${
              activeTab === 'profile'
                ? 'bg-orange-50 text-orange-600 border-orange-200 ring-2 ring-orange-500/20 shadow-2xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 shadow-subtle hover:shadow-card'
            }`}
          >
            <UserCircle className={`w-5 h-5 transition-colors ${activeTab === 'profile' ? 'text-orange-600' : 'text-slate-600 group-hover:text-slate-800'}`} />
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

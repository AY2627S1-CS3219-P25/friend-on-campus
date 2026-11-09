/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-07
 * Scope: Use royal blue for the selected page and fresh coral for the permanent mobile Post action.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Codex (model: GPT-6), date: 2026-11-07
 * Scope: Clarify Browse and Places labels, distinguish the current page from Post with a top marker, and keep the bottom bar through tablet widths.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Codex (model: GPT-6), date: 2026-11-07
 * Scope: Refine the approved campus UI with quieter surfaces, readable hierarchy, and accessible interactions.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Renamed Tasks navigation item to My Errands for natural user mental model and consistent errand vocabulary.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Redesigned mobile center Post action to flush TikTok/Instagram style with aligned baseline and no protrusion.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Streamlined mobile bottom dock to 5-item industry standard with elevated center Post action and moved Alerts to top header.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-06
 * Scope: Redesigned BottomNav with frosted glass floating dock, spring-feel pill indicators, and ergonomic touch targets.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Redesigned BottomNav with frosted-glass mobile bar, touch-friendly footprints (>=44px), active glowing indicator pills, and ergonomic spacing.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted mobile bottom navigation bar from student-app App.tsx into components/BottomNav.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { Clock, Compass, PlusCircle, Store, UserCircle } from 'lucide-react';
import { StudentTab } from './HeaderNav';

interface BottomNavProps {
  activeTab: StudentTab;
  onSelectTab: (tab: StudentTab) => void;
  onOpenProfile: () => void;
  unreadNotificationsCount?: number;
}

export function BottomNav({
  activeTab,
  onSelectTab,
  onOpenProfile,
}: BottomNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="student-bottom-nav fixed inset-x-0 bottom-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-2 pt-1.5 pb-2 flex justify-between items-center z-40 lg:hidden shadow-[0_-8px_30px_rgba(0,40,85,0.06)]"
    >
      {/* 1. Browse */}
      <button
        type="button"
        aria-current={activeTab === 'feed' ? 'page' : undefined}
        onClick={() => onSelectTab('feed')}
        className={`relative flex-1 flex flex-col items-center justify-center min-h-[56px] pt-2 pb-1 before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:h-0.5 before:w-6 before:rounded-full before:bg-campus-blue before:opacity-0 aria-[current=page]:before:opacity-100 transition-all duration-150 cursor-pointer ${
          activeTab === 'feed'
            ? 'text-campus-blue font-semibold'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'feed' ? 'bg-campus-blue-soft text-campus-blue shadow-2xs' : ''}`}>
          <Compass className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className="text-xs mt-0.5 tracking-tight font-semibold">Browse</span>
      </button>

      {/* 2. Places */}
      <button
        type="button"
        aria-current={activeTab === 'spots' ? 'page' : undefined}
        onClick={() => onSelectTab('spots')}
        className={`relative flex-1 flex flex-col items-center justify-center min-h-[56px] pt-2 pb-1 before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:h-0.5 before:w-6 before:rounded-full before:bg-campus-blue before:opacity-0 aria-[current=page]:before:opacity-100 transition-all duration-150 cursor-pointer ${
          activeTab === 'spots'
            ? 'text-campus-blue font-semibold'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'spots' ? 'bg-campus-blue-soft text-campus-blue shadow-2xs' : ''}`}>
          <Store className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className="text-xs mt-0.5 tracking-tight font-semibold">Places</span>
      </button>

      {/* 3. Center Action: Post (Option 1 - Flush Center) */}
      <button
        type="button"
        aria-label="Post errand"
        aria-current={activeTab === 'post' ? 'page' : undefined}
        onClick={() => onSelectTab('post')}
        className={`relative flex-1 flex flex-col items-center justify-center min-h-[56px] pt-2 pb-1 before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:h-0.5 before:w-6 before:rounded-full before:bg-campus-blue before:opacity-0 aria-[current=page]:before:opacity-100 transition-all duration-150 cursor-pointer ${
          activeTab === 'post'
            ? 'text-campus-blue font-semibold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div
          className={`p-1.5 rounded-xl transition-all duration-150 ${
            activeTab === 'post'
              ? 'bg-campus-coral text-campus-ink'
              : 'bg-campus-coral text-campus-ink hover:bg-campus-coral-hover'
          }`}
        >
          <PlusCircle className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className="text-xs mt-0.5 tracking-tight font-semibold">Post</span>
      </button>

      {/* 4. My Errands (Delivering / Posted Orders) */}
      <button
        type="button"
        aria-label="My Errands"
        aria-current={activeTab === 'tasks' ? 'page' : undefined}
        onClick={() => onSelectTab('tasks')}
        className={`relative flex-1 flex flex-col items-center justify-center min-h-[56px] pt-2 pb-1 before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:h-0.5 before:w-6 before:rounded-full before:bg-campus-blue before:opacity-0 aria-[current=page]:before:opacity-100 transition-all duration-150 cursor-pointer ${
          activeTab === 'tasks'
            ? 'text-campus-blue font-semibold'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'tasks' ? 'bg-campus-blue-soft text-campus-blue shadow-2xs' : ''}`}>
          <Clock className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className="text-xs mt-0.5 tracking-tight font-semibold">My Errands</span>
      </button>

      {/* 5. Profile */}
      <button
        type="button"
        aria-current={activeTab === 'profile' ? 'page' : undefined}
        onClick={onOpenProfile}
        className={`relative flex-1 flex flex-col items-center justify-center min-h-[56px] pt-2 pb-1 before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:h-0.5 before:w-6 before:rounded-full before:bg-campus-blue before:opacity-0 aria-[current=page]:before:opacity-100 transition-all duration-150 cursor-pointer ${
          activeTab === 'profile'
            ? 'text-campus-blue font-semibold'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'profile' ? 'bg-campus-blue-soft text-campus-blue shadow-2xs' : ''}`}>
          <UserCircle className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className="text-xs mt-0.5 tracking-tight font-semibold">Profile</span>
      </button>
    </nav>
  );
}

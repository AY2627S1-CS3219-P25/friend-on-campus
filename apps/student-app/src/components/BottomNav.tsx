/**
 * AI Assistance Disclosure:
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
      className="student-bottom-nav fixed inset-x-0 bottom-0 w-full bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-2 pt-1.5 pb-2 flex justify-between items-center z-40 md:hidden shadow-[0_-8px_30px_rgba(0,40,85,0.06)]"
    >
      {/* 1. Feed */}
      <button
        type="button"
        aria-current={activeTab === 'feed' ? 'page' : undefined}
        onClick={() => onSelectTab('feed')}
        className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 transition-all duration-150 cursor-pointer ${
          activeTab === 'feed'
            ? 'text-nus-orange font-bold scale-105'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'feed' ? 'bg-orange-50 text-nus-orange shadow-2xs' : ''}`}>
          <Compass className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-semibold">Feed</span>
      </button>

      {/* 2. Spots */}
      <button
        type="button"
        aria-current={activeTab === 'spots' ? 'page' : undefined}
        onClick={() => onSelectTab('spots')}
        className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 transition-all duration-150 cursor-pointer ${
          activeTab === 'spots'
            ? 'text-nus-orange font-bold scale-105'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'spots' ? 'bg-orange-50 text-nus-orange shadow-2xs' : ''}`}>
          <Store className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-semibold">Spots</span>
      </button>

      {/* 3. Center Action: Post (Option 1 - Flush Center) */}
      <button
        type="button"
        aria-label="Post"
        aria-current={activeTab === 'post' ? 'page' : undefined}
        onClick={() => onSelectTab('post')}
        className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 transition-all duration-150 cursor-pointer ${
          activeTab === 'post'
            ? 'text-nus-orange font-bold scale-105'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <div
          className={`p-1.5 rounded-xl transition-all duration-150 ${
            activeTab === 'post'
              ? 'bg-gradient-to-tr from-nus-orange to-amber-500 text-white shadow-sm ring-2 ring-orange-200'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-2xs'
          }`}
        >
          <PlusCircle className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-semibold">Post</span>
      </button>

      {/* 4. Tasks */}
      <button
        type="button"
        aria-current={activeTab === 'tasks' ? 'page' : undefined}
        onClick={() => onSelectTab('tasks')}
        className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 transition-all duration-150 cursor-pointer ${
          activeTab === 'tasks'
            ? 'text-nus-orange font-bold scale-105'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'tasks' ? 'bg-orange-50 text-nus-orange shadow-2xs' : ''}`}>
          <Clock className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-semibold">Tasks</span>
      </button>

      {/* 5. Profile */}
      <button
        type="button"
        aria-current={activeTab === 'profile' ? 'page' : undefined}
        onClick={onOpenProfile}
        className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 transition-all duration-150 cursor-pointer ${
          activeTab === 'profile'
            ? 'text-nus-orange font-bold scale-105'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className={`p-1.5 rounded-xl transition-colors ${activeTab === 'profile' ? 'bg-orange-50 text-nus-orange shadow-2xs' : ''}`}>
          <UserCircle className="w-5 h-5 stroke-[2.2]" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-semibold">Profile</span>
      </button>
    </nav>
  );
}

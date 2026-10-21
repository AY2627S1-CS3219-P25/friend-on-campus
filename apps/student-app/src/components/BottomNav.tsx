/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted mobile bottom navigation bar from student-app App.tsx into components/BottomNav.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { Clock, Compass, PlusCircle, Store, UserCircle } from 'lucide-react';
import { NotificationBell } from '../notifications/NotificationBell';
import { StudentTab } from './HeaderNav';

interface BottomNavProps {
  activeTab: StudentTab;
  onSelectTab: (tab: StudentTab) => void;
  onOpenProfile: () => void;
  unreadNotificationsCount: number;
}

export function BottomNav({
  activeTab,
  onSelectTab,
  onOpenProfile,
  unreadNotificationsCount,
}: BottomNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className="student-bottom-nav fixed inset-x-0 bottom-0 w-full bg-white border-t border-slate-200 px-3 pt-2 flex justify-around items-center z-40 md:hidden"
    >
      <button
        aria-current={activeTab === 'feed' ? 'page' : undefined}
        onClick={() => onSelectTab('feed')}
        className={`flex flex-col items-center py-1 transition ${
          activeTab === 'feed' ? 'text-nus-orange font-bold' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Compass className="w-5 h-5" />
        <span className="text-xs mt-0.5">Feed</span>
      </button>

      <button
        aria-current={activeTab === 'post' ? 'page' : undefined}
        onClick={() => onSelectTab('post')}
        className={`flex flex-col items-center py-1 transition ${
          activeTab === 'post' ? 'text-nus-orange font-bold' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <PlusCircle className="w-5 h-5" />
        <span className="text-xs mt-0.5">Post</span>
      </button>

      <button
        aria-current={activeTab === 'spots' ? 'page' : undefined}
        onClick={() => onSelectTab('spots')}
        className={`flex flex-col items-center py-1 transition ${
          activeTab === 'spots' ? 'text-nus-orange font-bold' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Store className="w-5 h-5" />
        <span className="text-xs mt-0.5">Spots</span>
      </button>

      <button
        aria-current={activeTab === 'tasks' ? 'page' : undefined}
        onClick={() => onSelectTab('tasks')}
        className={`flex flex-col items-center py-1 transition ${
          activeTab === 'tasks' ? 'text-nus-orange font-bold' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Clock className="w-5 h-5" />
        <span className="text-xs mt-0.5">Tasks</span>
      </button>

      <NotificationBell
        variant="tab"
        unreadCount={unreadNotificationsCount}
        active={activeTab === 'alerts'}
        onClick={() => onSelectTab('alerts')}
      />

      <button
        aria-current={activeTab === 'profile' ? 'page' : undefined}
        onClick={onOpenProfile}
        className={`flex flex-col items-center py-1 transition ${
          activeTab === 'profile'
            ? 'text-nus-orange font-bold'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <UserCircle className="w-5 h-5" />
        <span className="text-xs mt-0.5">Profile</span>
      </button>
    </nav>
  );
}

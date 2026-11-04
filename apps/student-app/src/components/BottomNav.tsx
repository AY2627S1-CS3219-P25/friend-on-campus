/**
 * AI Assistance Disclosure:
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
  const tabs = [
    { key: 'feed' as StudentTab, label: 'Feed', icon: Compass, onClick: () => onSelectTab('feed') },
    { key: 'post' as StudentTab, label: 'Post', icon: PlusCircle, onClick: () => onSelectTab('post') },
    { key: 'spots' as StudentTab, label: 'Spots', icon: Store, onClick: () => onSelectTab('spots') },
    { key: 'tasks' as StudentTab, label: 'Tasks', icon: Clock, onClick: () => onSelectTab('tasks') },
  ];

  return (
    <nav
      aria-label="Main navigation"
      className="student-bottom-nav fixed inset-x-0 bottom-0 w-full bg-white/95 backdrop-blur-lg border-t border-slate-200/90 px-2 pt-1.5 pb-2 flex justify-around items-center z-40 md:hidden shadow-[0_-4px_25px_rgba(0,0,0,0.06)]"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={tab.onClick}
            className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-nus-orange font-bold scale-105'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`p-1 rounded-lg ${isActive ? 'bg-orange-50' : ''}`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 tracking-tight font-medium">{tab.label}</span>
          </button>
        );
      })}

      {/* Alerts / Notifications Tab */}
      <NotificationBell
        variant="tab"
        unreadCount={unreadNotificationsCount}
        active={activeTab === 'alerts'}
        onClick={() => onSelectTab('alerts')}
      />

      {/* Profile Tab */}
      <button
        type="button"
        aria-current={activeTab === 'profile' ? 'page' : undefined}
        onClick={onOpenProfile}
        className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-2 py-1 rounded-xl transition-all cursor-pointer ${
          activeTab === 'profile'
            ? 'text-nus-orange font-bold scale-105'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <div className={`p-1 rounded-lg ${activeTab === 'profile' ? 'bg-orange-50' : ''}`}>
          <UserCircle className="w-5 h-5" />
        </div>
        <span className="text-[10px] mt-0.5 tracking-tight font-medium">Profile</span>
      </button>
    </nav>
  );
}

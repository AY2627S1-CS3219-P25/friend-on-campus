/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted alerts/notifications page from student-app App.tsx into pages/AlertsPage.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { NotificationDTO } from '@campus-errand/common-dtos';
import { NotificationPanel } from '../notifications/NotificationBell';

interface AlertsPageProps {
  items: NotificationDTO[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onRefresh: () => void;
  onOpenErrand: (notification: NotificationDTO) => void;
}

export function AlertsPage({
  items,
  unreadCount,
  isLoading,
  error,
  onMarkRead,
  onMarkAllRead,
  onRefresh,
  onOpenErrand,
}: AlertsPageProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl lg:text-2xl font-bold text-slate-800">Alerts</h2>
        <p className="text-sm text-slate-500 mt-1">
          Every errand a courier has acted on, newest first. Open one to see its stages; unread
          alerts wait here until you do.
        </p>
      </div>
      <NotificationPanel
        items={items}
        unreadCount={unreadCount}
        isLoading={isLoading}
        error={error}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
        onRefresh={onRefresh}
        onOpenErrand={onOpenErrand}
      />
    </div>
  );
}

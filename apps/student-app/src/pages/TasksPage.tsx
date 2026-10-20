/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Each card of an accepted-or-later errand gains a Chat toggle that expands the conversation in place
 * (author's D9, F8.1.1); OPEN errands have no conversation yet and show no toggle.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted active tasks page from student-app App.tsx into pages/TasksPage.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)
// AI-generated (edited by Reallyeasy1)

import { useState } from 'react';
import { OrderDTO } from '@campus-errand/common-dtos';
import { Coins, MessageCircle } from 'lucide-react';
import { ExpandableNotes } from '../components/ExpandableNotes';
import { ChatPanel } from '../chat/ChatPanel';
import type { ChatApi } from '../chat/useChat';

interface TasksPageProps {
  orders: OrderDTO[];
  currentUserId: string | null;
  chat: ChatApi;
}

/** A conversation exists from accept onwards (F8.1); before that the card has nothing to open. */
const CHAT_STATUSES: ReadonlySet<OrderDTO['status']> = new Set(['ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'DISPUTED']);

export function TasksPage({ orders, currentUserId, chat }: TasksPageProps) {
  const [openChat, setOpenChat] = useState<string | null>(null);
  const groups = [
    {
      key: 'posted',
      title: 'Tasks posted',
      description: 'Errands you requested from other students.',
      tasks: orders.filter((task) => currentUserId && task.requesterId === currentUserId),
    },
    {
      key: 'accepted',
      title: 'Tasks accepted',
      description: 'Errands you are delivering for other students.',
      tasks: orders.filter((task) => currentUserId && task.courierId === currentUserId),
    },
  ];

  return (
    <div className="space-y-8">
      <h2 className="text-xl lg:text-2xl font-bold text-slate-800">My Tasks</h2>
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`tasks-${group.key}`} className="space-y-3">
          <div>
            <h3 id={`tasks-${group.key}`} className="text-lg font-bold text-slate-800">
              {group.title}{' '}
              <span className="text-sm font-medium text-slate-500">({group.tasks.length})</span>
            </h3>
            <p className="text-sm text-slate-500">{group.description}</p>
          </div>
          <div className="responsive-card-grid items-start">
            {group.tasks.length === 0 && (
              <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                No {group.key} tasks yet.
              </p>
            )}
            {group.tasks.map((task) => (
              <article
                key={task.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 space-y-2"
              >
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <span className="text-sm font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {task.orderCode}
                  </span>
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">
                    {task.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p
                  title={task.itemDescription}
                  className="text-sm font-bold text-slate-800 h-10 leading-5 line-clamp-2"
                >
                  {task.itemDescription}
                </p>
                <p className="flex items-center gap-1 text-sm font-bold text-amber-700">
                  <Coins className="h-4 w-4" />
                  {task.rewardCredits} credits
                </p>
                <ExpandableNotes notes={task.specialNotes} />
                <p title={task.supplierName} className="truncate text-xs text-slate-500">
                  Pickup: {task.supplierName}
                </p>
                <p title={task.dropoffLocation} className="truncate text-xs text-slate-500">
                  Dropoff: {task.dropoffLocation}
                </p>
                {CHAT_STATUSES.has(task.status) && (
                  <>
                    <button
                      type="button"
                      aria-expanded={openChat === task.id}
                      onClick={() => setOpenChat((current) => (current === task.id ? null : task.id))}
                      className="flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {openChat === task.id ? 'Hide chat' : 'Chat'}
                    </button>
                    {openChat === task.id && <ChatPanel orderId={task.id} currentUserId={currentUserId} chat={chat} />}
                  </>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

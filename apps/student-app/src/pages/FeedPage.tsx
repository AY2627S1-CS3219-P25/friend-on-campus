/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted errand feed page from student-app App.tsx into pages/FeedPage.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { OrderDTO } from '@campus-errand/common-dtos';
import { ErrandCard } from '../components/ErrandCard';

const FEED_ZONES = ['ALL', 'COM3', 'UTown', 'PGPR', 'FASS', 'Science', 'Engineering'];

interface FeedPageProps {
  filteredOrders: OrderDTO[];
  selectedZone: string;
  onSelectZone: (zone: string) => void;
  ordersLoading: boolean;
  ordersError: string | null;
  currentUserId: string | null;
  acceptingOrderId: string | null;
  onAcceptOrder: (orderId: string) => void;
}

export function FeedPage({
  filteredOrders,
  selectedZone,
  onSelectZone,
  ordersLoading,
  ordersError,
  currentUserId,
  acceptingOrderId,
  onAcceptOrder,
}: FeedPageProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl lg:text-2xl font-bold text-slate-800">Errand Feed</h2>
        <span className="text-sm bg-slate-200 px-2 py-0.5 rounded-full text-slate-700 font-semibold">
          {filteredOrders.length} Open
        </span>
      </div>

      {/* Campus Zone Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap">
        {FEED_ZONES.map((zone) => (
          <button
            key={zone}
            onClick={() => onSelectZone(zone)}
            className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              selectedZone === zone
                ? 'bg-nus-orange text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            {zone}
          </button>
        ))}
      </div>

      {/* Errand Cards List */}
      <div className="responsive-card-grid">
        {ordersLoading && <p role="status">Loading errands…</p>}
        {!ordersLoading && !ordersError && filteredOrders.length === 0 && (
          <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            No open errands in this zone.
          </p>
        )}
        {filteredOrders.map((order) => (
          <ErrandCard
            key={order.id}
            order={order}
            currentUserId={currentUserId}
            acceptingOrderId={acceptingOrderId}
            onAcceptOrder={onAcceptOrder}
          />
        ))}
      </div>
    </div>
  );
}

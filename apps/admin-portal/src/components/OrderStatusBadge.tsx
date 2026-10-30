/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted OrderStatusBadge component into src/components/OrderStatusBadge.tsx.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

import { Activity, CheckCircle, CheckSquare, Clock, XCircle } from 'lucide-react';
import { OrderStatus } from '@campus-errand/common-dtos';

export function renderOrderStatusBadge(status: OrderStatus) {
  switch (status) {
    case 'PENDING':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 mr-1" />
          PENDING
        </span>
      );
    case 'OPEN':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3 h-3 mr-1" />
          OPEN
        </span>
      );
    case 'ACCEPTED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
          <Activity className="w-3 h-3 mr-1" />
          ACCEPTED
        </span>
      );
    case 'IN_TRANSIT':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
          <Activity className="w-3 h-3 mr-1" />
          IN TRANSIT
        </span>
      );
    case 'DELIVERED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
          <CheckSquare className="w-3 h-3 mr-1" />
          DELIVERED
        </span>
      );
    case 'COMPLETED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          COMPLETED
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
          <XCircle className="w-3 h-3 mr-1" />
          CANCELLED
        </span>
      );
    case 'EXPIRED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
          <Clock className="w-3 h-3 mr-1" />
          EXPIRED
        </span>
      );
    case 'REJECTED':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3 mr-1" />
          REJECTED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
          {status}
        </span>
      );
  }
}

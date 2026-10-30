/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-21
 * Scope: Added Dispute Cancel button alongside Force Complete for DELIVERED orders in OrdersPage.tsx to match backend adminCancelOrder support.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted OrdersPage state management component into src/pages/OrdersPage.tsx.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

import {
  Activity,
  ArrowUpDown,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Package,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { OrderDTO, OrderStatus } from '@campus-errand/common-dtos';
import { CAMPUS_ZONES } from '../constants';
import { renderOrderStatusBadge } from '../components/OrderStatusBadge';

interface OrdersPageProps {
  orders: OrderDTO[];
  pageSize: number;
  orderStats: {
    total: number;
    open: number;
    accepted: number;
    inTransit: number;
    delivered: number;
    completed: number;
    cancelledOrExpired: number;
    totalRewardCredits: number;
  };
  searchQueryOrders: string;
  setSearchQueryOrders: (q: string) => void;
  setCurrentPageOrders: (page: number | ((p: number) => number)) => void;
  selectedOrderZone: string;
  setSelectedOrderZone: (zone: string) => void;
  selectedOrderStatus: OrderStatus | 'ALL';
  setSelectedOrderStatus: (status: OrderStatus | 'ALL') => void;
  isLoadingOrders: boolean;
  filteredAndSortedOrders: OrderDTO[];
  paginatedOrders: OrderDTO[];
  handleSortOrders: (field: keyof OrderDTO) => void;
  openOrderAction: (order: OrderDTO, type: 'cancel' | 'complete' | 'unassign') => void;
  currentPageOrders: number;
  totalPagesOrders: number;
}

export function OrdersPage({
  orders,
  pageSize,
  orderStats,
  searchQueryOrders,
  setSearchQueryOrders,
  setCurrentPageOrders,
  selectedOrderZone,
  setSelectedOrderZone,
  selectedOrderStatus,
  setSelectedOrderStatus,
  isLoadingOrders,
  filteredAndSortedOrders,
  paginatedOrders,
  handleSortOrders,
  openOrderAction,
  currentPageOrders,
  totalPagesOrders,
}: OrdersPageProps) {
  return (
            <div className="space-y-4">
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Errands</p>
                    <p className="text-2xl font-black text-slate-900 mt-1">{orderStats.total}</p>
                    <p className="text-xs text-slate-400 mt-0.5">All order records</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Open & Claimed</p>
                    <p className="text-2xl font-black text-amber-600 mt-1">{orderStats.open + orderStats.accepted}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{orderStats.open} open • {orderStats.accepted} claimed</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">In Transit & Delivered</p>
                    <p className="text-2xl font-black text-purple-600 mt-1">{orderStats.inTransit + orderStats.delivered}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{orderStats.inTransit} active • {orderStats.delivered} awaiting confirm</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Settled & Closed</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{orderStats.completed}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{orderStats.cancelledOrExpired} cancelled/expired</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Filter, Search & Controls Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQueryOrders}
                      onChange={(e) => {
                        setSearchQueryOrders(e.target.value);
                        setCurrentPageOrders(1);
                      }}
                      placeholder="Search by order code, items, dropoff location, requester or courier ID..."
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {searchQueryOrders && (
                      <button
                        onClick={() => {
                          setSearchQueryOrders('');
                          setCurrentPageOrders(1);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Zone Filter */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-xs font-semibold text-slate-500">Zone:</span>
                    <select
                      value={selectedOrderZone}
                      onChange={(e) => {
                        setSelectedOrderZone(e.target.value);
                        setCurrentPageOrders(1);
                      }}
                      className="text-sm border border-slate-200 rounded-lg px-2.5 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="ALL">All Campus Zones</option>
                      {CAMPUS_ZONES.map((z) => (
                        <option key={z} value={z}>{z}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Status Filter Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 mr-1">Status:</span>
                  {(['ALL', 'PENDING', 'OPEN', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'REJECTED'] as const).map(
                    (st) => {
                      const isSelected = selectedOrderStatus === st;
                      const count =
                        st === 'ALL'
                          ? orders.length
                          : orders.filter((o) => o.status === st).length;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => {
                            setSelectedOrderStatus(st);
                            setCurrentPageOrders(1);
                          }}
                          className={`text-xs px-2.5 py-1 rounded-full font-bold transition flex items-center space-x-1 ${
                            isSelected
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <span>{st === 'ALL' ? 'All Orders' : st}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                              isSelected ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {count}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Orders Table Container */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {isLoadingOrders ? (
                  <div className="p-12 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    <p className="text-sm font-semibold">Loading orders from Order Service...</p>
                  </div>
                ) : filteredAndSortedOrders.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-base font-bold text-slate-700">No errands found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQueryOrders || selectedOrderStatus !== 'ALL' || selectedOrderZone !== 'ALL'
                        ? 'Try clearing your filters or search query.'
                        : 'No orders have been placed in the system yet.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                          <tr>
                            <th className="p-4 cursor-pointer hover:text-slate-900" onClick={() => handleSortOrders('orderCode')}>
                              <div className="flex items-center space-x-1">
                                <span>Order Code</span>
                                <ArrowUpDown className="w-3 h-3" />
                              </div>
                            </th>
                            <th className="p-4">Item & Dropoff</th>
                            <th className="p-4">Requester & Courier</th>
                            <th className="p-4 cursor-pointer hover:text-slate-900" onClick={() => handleSortOrders('rewardCredits')}>
                              <div className="flex items-center space-x-1">
                                <span>Escrow Reward</span>
                                <ArrowUpDown className="w-3 h-3" />
                              </div>
                            </th>
                            <th className="p-4">Status & Version</th>
                            <th className="p-4 text-right">Admin Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedOrders.map((order) => {
                            const isTerminal =
                              order.status === 'COMPLETED' ||
                              order.status === 'CANCELLED' ||
                              order.status === 'EXPIRED' ||
                              order.status === 'REJECTED';
                            return (
                              <tr key={order.id} className="hover:bg-slate-50/80 transition">
                                <td className="p-4 align-top">
                                  <div className="font-mono font-bold text-slate-900">{order.orderCode}</div>
                                  <div className="text-[11px] text-slate-400 mt-0.5">
                                    {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  {order.specialNotes && (
                                    <div className="text-[11px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 border border-amber-200 max-w-xs truncate" title={order.specialNotes}>
                                      Note: {order.specialNotes}
                                    </div>
                                  )}
                                </td>
                                <td className="p-4 align-top">
                                  <div className="font-semibold text-slate-800">{order.itemDescription}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    📍 To: <span className="font-medium text-slate-700">{order.dropoffLocation}</span>
                                  </div>
                                  <div className="text-xs text-slate-400 mt-0.5">
                                    Zone: <span className="font-medium text-slate-600">{order.campusZone}</span>
                                    {order.supplierName && ` • ${order.supplierName}`}
                                  </div>
                                </td>
                                <td className="p-4 align-top">
                                  <div className="text-xs text-slate-600">
                                    <span className="font-semibold text-slate-700">Req:</span>{' '}
                                    <span className="font-mono text-[11px]">{order.requesterId.slice(0, 8)}...</span>
                                  </div>
                                  <div className="text-xs text-slate-600 mt-1">
                                    <span className="font-semibold text-slate-700">Courier:</span>{' '}
                                    {order.courierId ? (
                                      <span className="font-mono text-[11px] text-blue-700">{order.courierId.slice(0, 8)}...</span>
                                    ) : (
                                      <span className="italic text-slate-400 text-xs">Unassigned</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-4 align-top">
                                  <div className="font-bold text-slate-900">{order.rewardCredits} pts</div>
                                  <div className="text-[11px] text-slate-400">
                                    {order.status === 'COMPLETED'
                                      ? 'Settled'
                                      : order.status === 'CANCELLED' || order.status === 'EXPIRED'
                                      ? 'Refunded'
                                      : order.status === 'REJECTED'
                                      ? 'Not Reserved'
                                      : order.status === 'PENDING'
                                      ? 'Awaiting Escrow'
                                      : 'Held in Escrow'}
                                  </div>
                                </td>
                                <td className="p-4 align-top">
                                  <div>{renderOrderStatusBadge(order.status)}</div>
                                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                                    v{order.version}
                                  </div>
                                </td>
                                <td className="p-4 align-top text-right">
                                  <div className="flex flex-col items-end gap-1.5">
                                    {order.status === 'PENDING' && (
                                      <span className="text-xs font-semibold text-amber-600 italic">Awaiting escrow</span>
                                    )}

                                    {order.status === 'OPEN' && (
                                      <button
                                        onClick={() => openOrderAction(order, 'cancel')}
                                        className="text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-300 rounded-lg px-2.5 py-1 transition shadow-sm"
                                      >
                                        Force Cancel
                                      </button>
                                    )}

                                    {order.status === 'ACCEPTED' && (
                                      <div className="flex items-center space-x-1.5">
                                        <button
                                          onClick={() => openOrderAction(order, 'unassign')}
                                          className="text-xs font-bold text-amber-600 hover:text-white hover:bg-amber-600 border border-amber-300 rounded-lg px-2.5 py-1 transition shadow-sm"
                                          title="Unassign courier and revert to OPEN"
                                        >
                                          Unassign Courier
                                        </button>
                                        <button
                                          onClick={() => openOrderAction(order, 'cancel')}
                                          className="text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-300 rounded-lg px-2.5 py-1 transition shadow-sm"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    )}

                                    {order.status === 'IN_TRANSIT' && (
                                      <button
                                        onClick={() => openOrderAction(order, 'cancel')}
                                        className="text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-300 rounded-lg px-2.5 py-1 transition shadow-sm"
                                        title="Cancel order during transit with refund"
                                      >
                                        Dispute Cancel
                                      </button>
                                    )}

                                    {order.status === 'DELIVERED' && (
                                      <div className="flex items-center space-x-1.5">
                                        <button
                                          onClick={() => openOrderAction(order, 'complete')}
                                          className="text-xs font-bold text-emerald-600 hover:text-white hover:bg-emerald-600 border border-emerald-300 rounded-lg px-2.5 py-1 transition shadow-sm"
                                          title="Resolve delivery dispute by releasing escrow to courier"
                                        >
                                          Force Complete
                                        </button>
                                        <button
                                          onClick={() => openOrderAction(order, 'cancel')}
                                          className="text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-300 rounded-lg px-2.5 py-1 transition shadow-sm"
                                          title="Resolve delivery dispute by cancelling and refunding requester"
                                        >
                                          Dispute Cancel
                                        </button>
                                      </div>
                                    )}

                                    {isTerminal && (
                                      <span className="text-xs font-semibold text-slate-400 italic">No actions needed</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {paginatedOrders.map((order) => {
                        const isTerminal =
                          order.status === 'COMPLETED' ||
                          order.status === 'CANCELLED' ||
                          order.status === 'EXPIRED' ||
                          order.status === 'REJECTED';
                        return (
                          <div key={order.id} className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-900">{order.orderCode}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] font-mono text-slate-400">v{order.version}</span>
                                {renderOrderStatusBadge(order.status)}
                              </div>
                            </div>

                            <div>
                              <p className="font-semibold text-slate-800 text-sm">{order.itemDescription}</p>
                              <p className="text-xs text-slate-500 mt-0.5">📍 Dropoff: {order.dropoffLocation}</p>
                              <p className="text-xs text-slate-400">Zone: {order.campusZone} • {order.rewardCredits} pts escrow</p>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-50">
                              <span>Req: {order.requesterId.slice(0, 8)}...</span>
                              <span>Courier: {order.courierId ? `${order.courierId.slice(0, 8)}...` : 'Unassigned'}</span>
                            </div>

                            {!isTerminal && order.status !== 'PENDING' && (
                              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 justify-end">
                                {order.status === 'OPEN' && (
                                  <button
                                    onClick={() => openOrderAction(order, 'cancel')}
                                    className="text-xs font-bold text-rose-600 border border-rose-300 rounded-lg px-3 py-1.5"
                                  >
                                    Force Cancel
                                  </button>
                                )}
                                {order.status === 'ACCEPTED' && (
                                  <>
                                    <button
                                      onClick={() => openOrderAction(order, 'unassign')}
                                      className="text-xs font-bold text-amber-600 border border-amber-300 rounded-lg px-3 py-1.5"
                                    >
                                      Unassign
                                    </button>
                                    <button
                                      onClick={() => openOrderAction(order, 'cancel')}
                                      className="text-xs font-bold text-rose-600 border border-rose-300 rounded-lg px-3 py-1.5"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                                {order.status === 'IN_TRANSIT' && (
                                  <button
                                    onClick={() => openOrderAction(order, 'cancel')}
                                    className="text-xs font-bold text-rose-600 border border-rose-300 rounded-lg px-3 py-1.5"
                                  >
                                    Dispute Cancel
                                  </button>
                                )}
                                {order.status === 'DELIVERED' && (
                                  <>
                                    <button
                                      onClick={() => openOrderAction(order, 'complete')}
                                      className="text-xs font-bold text-emerald-600 border border-emerald-300 rounded-lg px-3 py-1.5"
                                    >
                                      Force Complete
                                    </button>
                                    <button
                                      onClick={() => openOrderAction(order, 'cancel')}
                                      className="text-xs font-bold text-rose-600 border border-rose-300 rounded-lg px-3 py-1.5"
                                    >
                                      Dispute Cancel
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination Bar */}
                    <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
                      <div>
                        Showing <span className="font-bold text-slate-700">{(currentPageOrders - 1) * pageSize + 1}</span> to{' '}
                        <span className="font-bold text-slate-700">
                          {Math.min(currentPageOrders * pageSize, filteredAndSortedOrders.length)}
                        </span>{' '}
                        of <span className="font-bold text-slate-700">{filteredAndSortedOrders.length}</span> orders
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          disabled={currentPageOrders <= 1}
                          onClick={() => setCurrentPageOrders((p) => Math.max(1, p - 1))}
                          className="admin-square-button p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        {Array.from({ length: totalPagesOrders }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPageOrders(page)}
                            className={`admin-square-button rounded-lg text-xs font-bold transition px-2.5 py-1 ${
                              currentPageOrders === page
                                ? 'bg-slate-900 text-white'
                                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}

                        <button
                          disabled={currentPageOrders >= totalPagesOrders}
                          onClick={() => setCurrentPageOrders((p) => Math.min(totalPagesOrders, p + 1))}
                          className="admin-square-button p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
  );
}

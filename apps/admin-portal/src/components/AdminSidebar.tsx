/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Removed dead Audit & Disputes navigation button and wired Microservice Health button to trigger fetchServicesHealth.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted desktop left sidebar component into src/components/AdminSidebar.tsx.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

import { Activity, Building2, LogOut, Package, RefreshCw, Users } from 'lucide-react';
import { AdminNavSection } from '../constants';

interface AdminSidebarProps {
  activeNav: AdminNavSection;
  setActiveNav: (nav: AdminNavSection) => void;
  fetchOrders: () => void;
  fetchUsers: () => void;
  fetchServicesHealth: () => void;
  handleLogout: () => void;
  isLoggingOut: boolean;
}

export function AdminSidebar({
  activeNav,
  setActiveNav,
  fetchOrders,
  fetchUsers,
  fetchServicesHealth,
  handleLogout,
  isLoggingOut,
}: AdminSidebarProps) {
  return (
    <aside className="hidden lg:flex w-64 bg-slate-900 text-white flex-col shrink-0 overflow-y-auto">
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center font-black text-white text-xl">
          A
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide">NUS CampusErrand</h1>
          <p className="text-xs text-slate-400">Admin Control Portal</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 text-sm font-medium">
        <button
          onClick={() => setActiveNav('suppliers')}
          className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg transition ${
            activeNav === 'suppliers'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Campus Suppliers (M3)</span>
        </button>

        <button
          onClick={() => {
            setActiveNav('orders');
            fetchOrders();
          }}
          className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg transition ${
            activeNav === 'orders'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Errands & Orders</span>
        </button>

        <button
          onClick={() => {
            setActiveNav('users');
            fetchUsers();
          }}
          className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg transition ${
            activeNav === 'users'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users</span>
        </button>

        <button
          onClick={() => {
            setActiveNav('health');
            fetchServicesHealth();
          }}
          className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg transition ${
            activeNav === 'health'
              ? 'bg-blue-600 text-white shadow'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Microservice Health</span>
        </button>
      </nav>

      {/* Session Footer */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2.5">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center justify-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold text-slate-300 bg-slate-800 hover:bg-rose-600 hover:text-white disabled:opacity-60 transition"
        >
          {isLoggingOut ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
          <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
        </button>
        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-2 border-t border-slate-800">
          <span>API Gateway (:8080)</span>
          <span className="flex items-center text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
            Live
          </span>
        </div>
      </div>
    </aside>
  );
}

/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted top header bar, mobile navigation drawer, and action alert banner into src/components/AdminHeader.tsx.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

import {
  AlertCircle,
  CheckCircle,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AdminNavSection, DemoRole, SupplierLocationConflict } from '../constants';

interface AdminHeaderProps {
  activeNav: AdminNavSection;
  setActiveNav: (nav: AdminNavSection) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  currentRole: DemoRole;
  isLoading: boolean;
  isLoadingOrders: boolean;
  isLoadingUsers: boolean;
  fetchSuppliers: () => void;
  fetchOrders: () => void;
  fetchUsers: () => void;
  setAddFormErrors: (errors: Record<string, string>) => void;
  setAddDuplicateConflict: (conflict: SupplierLocationConflict | null) => void;
  setIsAddOpen: (open: boolean) => void;
  handleLogout: () => void;
  isLoggingOut: boolean;
  actionAlert: { type: 'success' | 'error'; message: string } | null;
  setActionAlert: (alert: { type: 'success' | 'error'; message: string } | null) => void;
}

export function AdminHeader({
  activeNav,
  setActiveNav,
  mobileMenuOpen,
  setMobileMenuOpen,
  currentRole,
  isLoading,
  isLoadingOrders,
  isLoadingUsers,
  fetchSuppliers,
  fetchOrders,
  fetchUsers,
  setAddFormErrors,
  setAddDuplicateConflict,
  setIsAddOpen,
  handleLogout,
  isLoggingOut,
  actionAlert,
  setActionAlert,
}: AdminHeaderProps) {
  return (
    <>
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-4 md:px-8 py-3 flex items-center justify-between gap-2 shadow-sm z-10">
        <div className="flex min-w-0 items-center space-x-2.5 sm:space-x-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {activeNav === 'suppliers'
                ? 'Supplier Directory & Spots'
                : activeNav === 'users'
                ? 'Users Directory'
                : activeNav === 'orders'
                ? 'Errands & Order State Management'
                : activeNav === 'health'
                ? 'System Microservices'
                : 'Audit & Disputes'}
            </h2>
            <p className="text-xs text-slate-500 hidden sm:block">
              Manage campus vendor pickup locations, operating hours, and real-time availability
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center space-x-2 sm:space-x-2.5">
          {/* Active Session Badge */}
          <div
            className={`hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
              currentRole === 'ADMIN'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : currentRole === 'STUDENT'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Role: {currentRole}</span>
          </div>

          <button
            onClick={() => {
              if (activeNav === 'orders') fetchOrders();
              else if (activeNav === 'users') fetchUsers();
              else fetchSuppliers();
            }}
            disabled={
              activeNav === 'orders'
                ? isLoadingOrders
                : activeNav === 'users'
                ? isLoadingUsers
                : isLoading
            }
            className="admin-icon-square flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition shrink-0"
            title="Refresh from API"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                (activeNav === 'orders'
                  ? isLoadingOrders
                  : activeNav === 'users'
                  ? isLoadingUsers
                  : isLoading)
                  ? 'animate-spin'
                  : ''
              }`}
            />
          </button>

          {activeNav === 'suppliers' && (
            <button
              onClick={() => {
                setAddFormErrors({});
                setAddDuplicateConflict(null);
                setIsAddOpen(true);
              }}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold px-3 md:px-4 py-2 rounded-lg shadow transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Location</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 text-white px-4 py-3 space-y-2 border-b border-slate-800">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { setActiveNav('suppliers'); setMobileMenuOpen(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${activeNav === 'suppliers' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}
            >
              Suppliers
            </button>
            <button
              onClick={() => {
                setActiveNav('orders');
                fetchOrders();
                setMobileMenuOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                activeNav === 'orders' ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => {
                setActiveNav('users');
                fetchUsers();
                setMobileMenuOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                activeNav === 'users' ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              Users
            </button>
            <button
              onClick={() => { setActiveNav('health'); setMobileMenuOpen(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${activeNav === 'health' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}
            >
              Health
            </button>
            {/* AI-generated (edited by jagdeepsh) */}
            <button
              onClick={() => {
                setActiveNav('audit');
                setMobileMenuOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                activeNav === 'audit' ? 'bg-blue-600 text-white' : 'text-slate-300'
              }`}
            >
              Audit & Disputes
            </button>
          </div>
          <div className="flex items-center justify-end pt-2 border-t border-slate-800">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              disabled={isLoggingOut}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-200 bg-slate-800 hover:bg-rose-600 hover:text-white disabled:opacity-60 transition"
            >
              {isLoggingOut ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
              <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Alert Banner */}
      {actionAlert && (
        <div
          className={`mx-4 md:mx-8 mt-4 p-3 rounded-xl border flex items-center justify-between text-xs font-medium shadow-sm ${
            actionAlert.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionAlert.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionAlert.message}</span>
          </div>
          <button
            onClick={() => setActionAlert(null)}
            className="p-1 hover:bg-black/5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </>
  );
}

/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted UsersPage directory component into src/pages/UsersPage.tsx.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

import {
  ArrowUpDown,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { UserDTO } from '@campus-errand/common-dtos';

interface UsersPageProps {
  isLoadingUsers: boolean;
  users: UserDTO[];
  userStats: { admins: number; students: number };
  searchQueryUsers: string;
  setSearchQueryUsers: (q: string) => void;
  setCurrentPageUsers: (page: number | ((p: number) => number)) => void;
  selectedUserRoles: string[];
  setDraftSelectedUserRoles: (roles: string[]) => void;
  setIsUserFilterModalOpen: (open: boolean) => void;
  activeUserFilterCount: number;
  pageSize: number;
  paginatedUsers: UserDTO[];
  filteredAndSortedUsers: UserDTO[];
  togglingUserIds: Set<string>;
  toggleUserStatus: (userId: string) => void;
  setToggleRoleConfirmed: (c: boolean) => void;
  setToggleRoleError: (err: string | null) => void;
  setTogglingRoleUser: (u: UserDTO | null) => void;
  setDeleteUserConfirmed: (c: boolean) => void;
  setDeleteUserError: (err: string | null) => void;
  setDeletingUser: (u: UserDTO | null) => void;
  handleSortUsers: (field: keyof UserDTO) => void;
  currentPageUsers: number;
  totalPagesUsers: number;
}

export function UsersPage({
  isLoadingUsers,
  users,
  userStats,
  searchQueryUsers,
  setSearchQueryUsers,
  setCurrentPageUsers,
  selectedUserRoles,
  setDraftSelectedUserRoles,
  setIsUserFilterModalOpen,
  activeUserFilterCount,
  pageSize,
  paginatedUsers,
  filteredAndSortedUsers,
  togglingUserIds,
  toggleUserStatus,
  setToggleRoleConfirmed,
  setToggleRoleError,
  setTogglingRoleUser,
  setDeleteUserConfirmed,
  setDeleteUserError,
  setDeletingUser,
  handleSortUsers,
  currentPageUsers,
  totalPagesUsers,
}: UsersPageProps) {
  return (
            <div className="space-y-4">
              {isLoadingUsers && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Loading users…</span>
                </div>
              )}

              {/* Desktop KPI Stats Grid */}
              <div className="grid grid-cols-3 gap-3 md:gap-4">
                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs md:text-sm text-slate-500 font-semibold">Total Users</span>
                  <p className="text-xl md:text-2xl font-black text-slate-900 mt-1">{users.length}</p>
                </div>
                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs md:text-sm text-slate-500 font-semibold">Admins</span>
                  <p className="text-xl md:text-2xl font-black text-blue-600 mt-1">{userStats.admins}</p>
                </div>
                <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs md:text-sm text-slate-500 font-semibold">Students</span>
                  <p className="text-xl md:text-2xl font-black text-amber-600 mt-1">{userStats.students}</p>
                </div>
              </div>

              {/* Filters & Search Row */}
              <div className="bg-white p-3.5 md:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md flex items-center">
                  <Search className="w-4 h-4 absolute left-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by username or email..."
                    value={searchQueryUsers}
                    onChange={(e) => {
                      setSearchQueryUsers(e.target.value);
                      setCurrentPageUsers(1);
                    }}
                    className="w-full pl-9 pr-12 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchQueryUsers && (
                    <button
                      onClick={() => setSearchQueryUsers('')}
                      className="admin-square-button absolute right-0 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setDraftSelectedUserRoles(selectedUserRoles);
                      setIsUserFilterModalOpen(true);
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border shrink-0 transition ${
                      activeUserFilterCount > 0
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Filter</span>
                    {activeUserFilterCount > 0 && (
                      <span className="ml-1 bg-blue-600 text-white rounded-full text-xs w-4 h-4 inline-flex items-center justify-center font-bold">
                        {activeUserFilterCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Mobile Card List View */}
              <div className="block xl:hidden space-y-3">
                {paginatedUsers.map((u) => (
                  <div
                    key={u.userId}
                    className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{u.username}</h3>
                        <p className="text-sm text-slate-500 mt-0.5">{u.email}</p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          u.userRole === 'ADMIN'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {u.userRole}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span
                        className={`text-xs font-semibold ${u.status ? 'text-emerald-600' : 'text-rose-500'}`}
                      >
                        {u.status ? 'Active' : 'Disabled'}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          disabled={togglingUserIds.has(u.userId)}
                          onClick={() => toggleUserStatus(u.userId)}
                          className={`text-sm font-bold px-2.5 py-1 rounded transition disabled:opacity-50 disabled:cursor-not-allowed ${
                            u.status ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {togglingUserIds.has(u.userId) ? 'Working…' : u.status ? 'Disable' : 'Reinstate'}
                        </button>
                        <button
                          onClick={() => {
                            setTogglingRoleUser(u);
                            setToggleRoleConfirmed(false);
                            setToggleRoleError(null);
                          }}
                          className={`text-sm font-bold px-2.5 py-1 rounded transition ${
                            u.userRole === 'ADMIN' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {u.userRole === 'ADMIN' ? 'Downgrade' : 'Upgrade'}
                        </button>
                        <button
                          onClick={() => {
                            setDeletingUser(u);
                            setDeleteUserConfirmed(false);
                            setDeleteUserError(null);
                          }}
                          className="admin-square-button p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {paginatedUsers.length === 0 && !isLoadingUsers && (
                  <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-slate-400 text-sm">
                    No users found matching your query.
                  </div>
                )}
              </div>

              {/* Desktop Data Table View */}
              <div className="hidden xl:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider select-none">
                      <th
                        onClick={() => handleSortUsers('username')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Username</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortUsers('email')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Email</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortUsers('userRole')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Role</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSortUsers('status')}
                        className="p-3.5 cursor-pointer hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Status</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedUsers.map((u) => (
                      <tr key={u.userId} className="hover:bg-slate-50 transition">
                        <td className="p-3.5 font-semibold text-slate-900">{u.username}</td>
                        <td className="p-3.5 text-slate-600">{u.email}</td>
                        <td className="p-3.5">
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              u.userRole === 'ADMIN' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.userRole}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {u.status ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-600 font-semibold">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 text-rose-500 font-semibold">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Disabled</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap space-x-1">
                          <button
                            disabled={togglingUserIds.has(u.userId)}
                            onClick={() => toggleUserStatus(u.userId)}
                            className={`text-sm font-bold px-2.5 py-1 rounded transition disabled:opacity-50 disabled:cursor-not-allowed ${
                              u.status ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {togglingUserIds.has(u.userId) ? '...' : u.status ? 'Disable' : 'Reinstate'}
                          </button>
                          <button
                            onClick={() => {
                              setTogglingRoleUser(u);
                              setToggleRoleConfirmed(false);
                              setToggleRoleError(null);
                            }}
                            className={`text-sm font-bold px-2.5 py-1 rounded transition ${
                              u.userRole === 'ADMIN' ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {u.userRole === 'ADMIN' ? 'Downgrade' : 'Upgrade'}
                          </button>
                          <button
                            onClick={() => {
                              setDeletingUser(u);
                              setDeleteUserConfirmed(false);
                              setDeleteUserError(null);
                            }}
                            className="admin-square-button p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="Delete user"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {paginatedUsers.length === 0 && !isLoadingUsers && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          No users found matching your query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Unified Pagination Bar */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-sm text-slate-600 flex flex-col sm:flex-row justify-between items-center gap-2">
                <span>
                  Showing {Math.min(filteredAndSortedUsers.length, (currentPageUsers - 1) * pageSize + 1)} to{' '}
                  {Math.min(filteredAndSortedUsers.length, currentPageUsers * pageSize)} of{' '}
                  {filteredAndSortedUsers.length} users
                </span>

                <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
                  <button
                    disabled={currentPageUsers <= 1}
                    onClick={() => setCurrentPageUsers((p) => Math.max(1, p - 1))}
                    className="admin-square-button p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {Array.from({ length: totalPagesUsers }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPageUsers(page)}
                      className={`admin-square-button rounded-lg text-sm font-bold transition ${
                        currentPageUsers === page
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    disabled={currentPageUsers >= totalPagesUsers}
                    onClick={() => setCurrentPageUsers((p) => Math.min(totalPagesUsers, p + 1))}
                    className="admin-square-button p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
  );
}

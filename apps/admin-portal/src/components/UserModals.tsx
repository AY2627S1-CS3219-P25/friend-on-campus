/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted User Filter, Delete Confirmation, Delete Success, and Role Toggle Confirmation modals into src/components/UserModals.tsx.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

import React from 'react';
import {
  CheckCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { UserDTO } from '@campus-errand/common-dtos';
import { USER_ROLES } from '../constants';

interface UserModalsProps {
  isUserFilterModalOpen: boolean;
  setIsUserFilterModalOpen: (open: boolean) => void;
  draftSelectedUserRoles: string[];
  setDraftSelectedUserRoles: React.Dispatch<React.SetStateAction<string[]>>;
  toggleFilterChip: (list: string[], item: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => void;
  resetUserFilters: () => void;
  selectedUserRoles: string[];
  setSelectedUserRoles: (roles: string[]) => void;
  setCurrentPageUsers: (page: number) => void;
  deletingUser: UserDTO | null;
  setDeletingUser: (u: UserDTO | null) => void;
  deleteUserConfirmed: boolean;
  setDeleteUserConfirmed: (c: boolean) => void;
  isDeletingUser: boolean;
  deleteUserError: string | null;
  setDeleteUserError: (err: string | null) => void;
  handleDeleteUser: () => void;
  deletedUserSuccess: string | null;
  setDeletedUserSuccess: (name: string | null) => void;
  togglingRoleUser: UserDTO | null;
  setTogglingRoleUser: (u: UserDTO | null) => void;
  toggleRoleConfirmed: boolean;
  setToggleRoleConfirmed: (c: boolean) => void;
  isTogglingRole: boolean;
  toggleRoleError: string | null;
  setToggleRoleError: (err: string | null) => void;
  handleToggleUserRole: () => void;
}

export function UserModals({
  isUserFilterModalOpen,
  setIsUserFilterModalOpen,
  draftSelectedUserRoles,
  setDraftSelectedUserRoles,
  toggleFilterChip,
  resetUserFilters,
  selectedUserRoles,
  setSelectedUserRoles,
  setCurrentPageUsers,
  deletingUser,
  setDeletingUser,
  deleteUserConfirmed,
  setDeleteUserConfirmed,
  isDeletingUser,
  deleteUserError,
  setDeleteUserError,
  handleDeleteUser,
  deletedUserSuccess,
  setDeletedUserSuccess,
  togglingRoleUser,
  setTogglingRoleUser,
  toggleRoleConfirmed,
  setToggleRoleConfirmed,
  isTogglingRole,
  toggleRoleError,
  setToggleRoleError,
  handleToggleUserRole,
}: UserModalsProps) {
  return (
    <>
      {/* Users Filter Modal */}
      {isUserFilterModalOpen && (
        <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Filter Users</h3>
              <button
                onClick={() => {
                  setDraftSelectedUserRoles(selectedUserRoles);
                  setIsUserFilterModalOpen(false);
                }}
                className="admin-square-button text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Role</label>
              <div className="flex flex-wrap gap-2">
                {USER_ROLES.map((role) => {
                  const active = draftSelectedUserRoles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => toggleFilterChip(draftSelectedUserRoles, role, setDraftSelectedUserRoles)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition border ${
                        active
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {role}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={resetUserFilters}
                className="text-sm font-bold text-slate-600 hover:text-slate-900"
              >
                Reset All Filters
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedUserRoles(draftSelectedUserRoles);
                  setIsUserFilterModalOpen(false);
                  setCurrentPageUsers(1);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-4 py-2 rounded-lg shadow"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Delete User Account</h3>
                <p className="text-sm text-slate-500">This action is permanent and cannot be undone</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-sm space-y-1">
              <div className="font-bold text-slate-900">{deletingUser.username}</div>
              <div className="text-slate-500">{deletingUser.email}</div>
            </div>

            {deleteUserError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                {deleteUserError}
              </div>
            )}

            <label className="flex items-start space-x-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteUserConfirmed}
                onChange={(e) => setDeleteUserConfirmed(e.target.checked)}
                disabled={isDeletingUser}
                className="rounded text-rose-600 focus:ring-rose-500 mt-0.5"
              />
              <span>I understand this action is irreversible and this account will be permanently deleted.</span>
            </label>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => {
                  setDeletingUser(null);
                  setDeleteUserConfirmed(false);
                  setDeleteUserError(null);
                }}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deleteUserConfirmed || isDeletingUser}
                onClick={handleDeleteUser}
                className="flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg shadow"
              >
                {isDeletingUser && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeletingUser ? 'Deleting…' : 'Delete Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Success Modal */}
      {deletedUserSuccess && (
        <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Account Deleted</h3>
              <p className="text-sm text-slate-500 mt-1">"{deletedUserSuccess}"'s account has been permanently deleted.</p>
            </div>
            <button
              onClick={() => setDeletedUserSuccess(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm py-2.5 rounded-lg shadow transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Upgrade/Downgrade User Role Confirmation Modal */}
      {togglingRoleUser && (
        <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div
              className={`flex items-center space-x-3 ${
                togglingRoleUser.userRole === 'ADMIN' ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  togglingRoleUser.userRole === 'ADMIN' ? 'bg-rose-50' : 'bg-emerald-50'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {togglingRoleUser.userRole === 'ADMIN' ? 'Downgrade to Student' : 'Upgrade to Admin'}
                </h3>
                <p className="text-sm text-slate-500">
                  {togglingRoleUser.userRole === 'ADMIN'
                    ? 'This account will lose Administrator access.'
                    : 'This account will gain full Administrator access.'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-sm space-y-1">
              <div className="font-bold text-slate-900">{togglingRoleUser.username}</div>
              <div className="text-slate-500">{togglingRoleUser.email}</div>
            </div>

            {toggleRoleError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
                {toggleRoleError}
              </div>
            )}

            <label className="flex items-start space-x-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={toggleRoleConfirmed}
                onChange={(e) => setToggleRoleConfirmed(e.target.checked)}
                disabled={isTogglingRole}
                className={`rounded mt-0.5 ${
                  togglingRoleUser.userRole === 'ADMIN'
                    ? 'text-rose-600 focus:ring-rose-500'
                    : 'text-emerald-600 focus:ring-emerald-500'
                }`}
              />
              <span>
                Yes, I am sure I want to{' '}
                {togglingRoleUser.userRole === 'ADMIN'
                  ? 'downgrade this admin to a student'
                  : 'upgrade this student to an admin'}
                .
              </span>
            </label>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isTogglingRole}
                onClick={() => {
                  setTogglingRoleUser(null);
                  setToggleRoleConfirmed(false);
                  setToggleRoleError(null);
                }}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!toggleRoleConfirmed || isTogglingRole}
                onClick={handleToggleUserRole}
                className={`flex items-center justify-center space-x-2 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg shadow ${
                  togglingRoleUser.userRole === 'ADMIN'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isTogglingRole && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {isTogglingRole
                    ? togglingRoleUser.userRole === 'ADMIN'
                      ? 'Downgrading…'
                      : 'Upgrading…'
                    : togglingRoleUser.userRole === 'ADMIN'
                      ? 'Downgrade'
                      : 'Upgrade'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

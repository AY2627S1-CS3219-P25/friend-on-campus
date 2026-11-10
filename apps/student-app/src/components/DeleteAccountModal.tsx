/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-07
 * Scope: Apply the approved student-app consistency pass: calmer surfaces, readable type, blue actions and selection, and preserved semantic status colours.
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 *
 * Tool: Google Antigravity Agent, date: 2026-11-06
 * Scope: Redesigned DeleteAccountModal with elevated dialog styling, rounded-2xl cards, tactile action buttons, and disclosure header.
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Light elegant theme update for Return to Login button.
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted account deletion confirmation and success modals from student-app App.tsx into components/DeleteAccountModal.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface DeleteAccountModalProps {
  showConfirmModal: boolean;
  confirmed: boolean;
  onToggleConfirmed: (checked: boolean) => void;
  isDeleting: boolean;
  error: { code: string; message: string } | null;
  onCancel: () => void;
  onConfirmDelete: () => void;
  showSuccessModal: boolean;
  onReturnToLogin: () => void;
}

export function DeleteAccountModal({
  showConfirmModal,
  confirmed,
  onToggleConfirmed,
  isDeleting,
  error,
  onCancel,
  onConfirmDelete,
  showSuccessModal,
  onReturnToLogin,
}: DeleteAccountModalProps) {
  return (
    <>
      {showConfirmModal && (
        <div className="dialog-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 shadow-2xs">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-base text-campus-ink">Delete Account</h3>
                <p className="text-xs text-slate-500 font-medium">This action is permanent</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Deleting your account will permanently remove your profile and cannot be undone. You
              will be logged out immediately.
            </p>

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs space-y-0.5">
                <p className="font-bold">{error.code}</p>
                <p>{error.message}</p>
              </div>
            )}

            <label className="flex items-start space-x-2.5 text-xs text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => onToggleConfirmed(e.target.checked)}
                disabled={isDeleting}
                className="rounded-md border-slate-300 text-rose-600 focus:ring-rose-500 mt-0.5"
              />
              <span className="font-medium">
                I understand this action is irreversible and my account will be permanently deleted.
              </span>
            </label>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={onCancel}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!confirmed || isDeleting}
                onClick={onConfirmDelete}
                className="flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-sm transition cursor-pointer active:scale-[0.99]"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? 'Deleting…' : 'Delete Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="dialog-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-2xs">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-base text-campus-ink">Account Deleted</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Your account has been permanently deleted.
              </p>
            </div>
            <button
              onClick={onReturnToLogin}
              className="w-full bg-campus-blue hover:bg-campus-blue-hover text-white font-semibold text-xs sm:text-sm py-3 rounded-2xl shadow-subtle transition-all cursor-pointer active:scale-[0.99]"
            >
              Return to Login
            </button>
          </div>
        </div>
      )}
    </>
  );
}

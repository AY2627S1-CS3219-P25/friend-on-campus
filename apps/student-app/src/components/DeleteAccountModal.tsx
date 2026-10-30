/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Light elegant theme update for Return to Login button.
 * Author review: <to be completed by yanhwee>
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
        <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Delete Account</h3>
                <p className="text-sm text-slate-500">This action is permanent</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Deleting your account will permanently remove your profile and cannot be undone. You
              will be logged out immediately.
            </p>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm space-y-0.5">
                <p className="font-bold">{error.code}</p>
                <p>{error.message}</p>
              </div>
            )}

            <label className="flex items-start space-x-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => onToggleConfirmed(e.target.checked)}
                disabled={isDeleting}
                className="rounded text-rose-600 focus:ring-rose-500 mt-0.5"
              />
              <span>
                I understand this action is irreversible and my account will be permanently deleted.
              </span>
            </label>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={onCancel}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!confirmed || isDeleting}
                onClick={onConfirmDelete}
                className="flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-sm px-4 py-2 rounded-lg shadow"
              >
                {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? 'Deleting…' : 'Delete Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessModal && (
        <div className="dialog-overlay fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Account Deleted</h3>
              <p className="text-sm text-slate-500 mt-1">
                Your account has been permanently deleted.
              </p>
            </div>
            <button
              onClick={onReturnToLogin}
              className="w-full bg-nus-orange hover:bg-orange-600 text-white font-bold text-sm py-2.5 rounded-xl shadow-xs transition cursor-pointer"
            >
              Return to Login
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted profile and credit wallet/ledger page from student-app App.tsx into pages/ProfileWalletPage.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { CreditTransactionDTO, CreditWalletDTO, UserDTO } from '@campus-errand/common-dtos';
import { RefreshCw, ShieldCheck } from 'lucide-react';

interface ProfileWalletPageProps {
  mode: 'profile' | 'wallet';
  profile: UserDTO | null;
  isLoadingProfile: boolean;
  profileError: { code: string; message: string } | null;
  isEditingProfile: boolean;
  editUsernameDraft: string;
  onChangeUsernameDraft: (draft: string) => void;
  isUpdatingProfile: boolean;
  updateProfileError: { code: string; message: string } | null;
  onStartEditingProfile: () => void;
  onCancelEditingProfile: () => void;
  onUpdateProfile: () => void;
  onLogout: () => void;
  isLoggingOut: boolean;
  onOpenDeleteAccountModal: () => void;
  wallet: CreditWalletDTO | null;
  ledger: CreditTransactionDTO[];
  isLoadingCredits: boolean;
  creditError: string | null;
  onRefreshCredits: () => void;
}

export function ProfileWalletPage({
  mode,
  profile,
  isLoadingProfile,
  profileError,
  isEditingProfile,
  editUsernameDraft,
  onChangeUsernameDraft,
  isUpdatingProfile,
  updateProfileError,
  onStartEditingProfile,
  onCancelEditingProfile,
  onUpdateProfile,
  onLogout,
  isLoggingOut,
  onOpenDeleteAccountModal,
  wallet,
  ledger,
  isLoadingCredits,
  creditError,
  onRefreshCredits,
}: ProfileWalletPageProps) {
  if (mode === 'profile') {
    return (
      <div className="w-full">
        <section aria-labelledby="profile-heading" className="min-w-0 space-y-4">
          <h2 id="profile-heading" className="text-xl lg:text-2xl font-bold text-slate-800">
            Profile Info
          </h2>

          {isLoadingProfile && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading profile…</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm space-y-0.5">
              <p className="font-bold">{profileError.code}</p>
              <p>{profileError.message}</p>
            </div>
          )}

          {profile && (
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5">
              <p className="text-xs text-slate-400 md:col-span-2">
                Fields marked with <span className="text-rose-600 font-bold">*</span> are compulsory.
              </p>

              <div>
                <label
                  htmlFor="profile-username"
                  className="block text-sm font-bold text-slate-700 mb-1"
                >
                  Username: <span className="text-rose-600">*</span>
                </label>
                <p className="text-xs text-slate-400 mb-1">
                  Must be 1-50 characters and unique (case-insensitive).
                </p>
                {updateProfileError && (
                  <p className="text-xs text-rose-600 mb-1">{updateProfileError.message}</p>
                )}
                <input
                  type="text"
                  id="profile-username"
                  value={isEditingProfile ? editUsernameDraft : profile.username}
                  disabled={!isEditingProfile || isUpdatingProfile}
                  onChange={(e) => onChangeUsernameDraft(e.target.value)}
                  className={`w-full text-sm p-2.5 rounded-lg border ${
                    isEditingProfile
                      ? 'border-nus-blue bg-white'
                      : 'border-slate-200 bg-slate-50 text-slate-500'
                  }`}
                />
              </div>

              <div>
                <label
                  htmlFor="profile-email"
                  className="block text-sm font-bold text-slate-700 mb-1"
                >
                  Email: <span className="text-rose-600">*</span>
                </label>
                <p className="text-xs text-slate-400 mb-1">
                  Read-only here. Must be a valid, unique email address.
                </p>
                <input
                  type="text"
                  id="profile-email"
                  value={profile.email}
                  disabled
                  className="w-full text-sm p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Role:</label>
                <p className="text-xs text-slate-400 mb-1">Read-only. Set by an administrator.</p>
                <div
                  className={`inline-block text-sm font-bold px-2.5 py-1 rounded-lg border ${
                    profile.userRole === 'ADMIN'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  {profile.userRole}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Status:</label>
                <p className="text-xs text-slate-400 mb-1">
                  Read-only. Whether your account is active.
                </p>
                <div
                  className={`inline-block text-sm font-bold px-2.5 py-1 rounded-lg border ${
                    profile.status
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {profile.status ? 'Active' : 'Disabled'}
                </div>
              </div>

              {!isEditingProfile ? (
                <button
                  onClick={onStartEditingProfile}
                  className="md:col-span-2 w-full bg-nus-blue hover:bg-blue-900 text-white font-bold text-sm py-2 rounded-lg transition"
                >
                  Edit
                </button>
              ) : (
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={onCancelEditingProfile}
                    disabled={isUpdatingProfile}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm py-2 rounded-lg transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onUpdateProfile}
                    disabled={isUpdatingProfile}
                    className="w-full flex items-center justify-center space-x-2 bg-nus-blue hover:bg-blue-900 text-white font-bold text-sm py-2 rounded-lg transition disabled:opacity-60"
                  >
                    {isUpdatingProfile && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isUpdatingProfile ? 'Updating…' : 'Update'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={onLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center space-x-2 bg-nus-blue hover:bg-blue-900 disabled:opacity-60 text-white font-bold text-sm py-2.5 rounded-lg shadow transition"
            >
              {isLoggingOut && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{isLoggingOut ? 'Logging out…' : 'Log Out'}</span>
            </button>

            <button
              onClick={onOpenDeleteAccountModal}
              className="w-full flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm py-2.5 rounded-lg shadow transition"
            >
              <span>Delete Account</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full">
      <section
        aria-labelledby="credit-heading"
        className="min-w-0 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start"
      >
        <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-2">
          <h2 id="credit-heading" className="text-xl lg:text-2xl font-bold text-slate-800">
            Credit Wallet & Ledger
          </h2>
          <button
            type="button"
            onClick={onRefreshCredits}
            disabled={isLoadingCredits}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingCredits ? 'animate-spin' : ''}`} />
            {creditError ? 'Retry credits' : 'Refresh credits'}
          </button>
        </div>
        {isLoadingCredits && (
          <p role="status" className="lg:col-span-2 text-sm text-slate-500">
            Loading wallet and transactions…
          </p>
        )}
        {creditError && (
          <p
            role="alert"
            className="lg:col-span-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            {creditError}
          </p>
        )}

        {/* Balance Card */}
        {wallet && (
          <>
            <div className="bg-gradient-to-br from-nus-blue to-blue-950 text-white rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-bold tracking-wider text-blue-200 uppercase">
                  NUS Closed Economy
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-sm text-blue-200 font-semibold">Total Account Balance</p>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-3xl font-black text-amber-300">
                  {wallet.availableCredits + wallet.escrowCredits}
                </span>
                <span className="text-sm text-blue-200 font-bold">Credits</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-blue-800/80">
                <div className="bg-blue-900/50 p-2.5 rounded-lg border border-blue-700/50">
                  <span className="text-xs text-blue-200 block">Available to Spend</span>
                  <span className="text-base font-bold text-emerald-400">
                    {wallet.availableCredits} C
                  </span>
                </div>
                <div className="bg-blue-900/50 p-2.5 rounded-lg border border-blue-700/50">
                  <span className="text-xs text-blue-200 block">Held in Escrow</span>
                  <span className="text-base font-bold text-amber-300">
                    {wallet.escrowCredits} C
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-blue-200">
                Total earned: {wallet.totalEarnedCredits} C
              </p>
            </div>

            {/* Transaction Ledger */}
            <div>
              <h3 className="font-bold text-sm text-slate-800 mb-2">Recent Ledger Transactions</h3>
              <div className="space-y-2">
                {ledger.length === 0 && (
                  <p className="text-sm text-slate-500">No credit transactions yet.</p>
                )}
                {ledger.map((transaction) => {
                  const labels = {
                    WELCOME_GRANT: 'Welcome Grant',
                    ESCROW_HOLD: 'Escrow Hold',
                    ESCROW_RELEASE: 'Escrow Settlement',
                    ESCROW_REFUND: 'Escrow Refund',
                  };
                  const incoming =
                    transaction.transactionType === 'ESCROW_REFUND' ||
                    transaction.toUserId === wallet.userId;
                  return (
                    <div
                      key={transaction.id}
                      className="bg-white p-3 rounded-xl border border-slate-200 text-sm flex justify-between items-start gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800">
                          {labels[transaction.transactionType]}
                        </p>
                        <p className="text-xs text-slate-500 break-words">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-slate-400 break-all">
                          {transaction.transactionCode}
                        </p>
                        <time
                          className="text-xs text-slate-400"
                          dateTime={transaction.createdAt}
                        >
                          {new Date(transaction.createdAt).toLocaleString()}
                        </time>
                      </div>
                      <span
                        className={`shrink-0 font-bold ${
                          incoming ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {incoming ? '+' : '−'}
                        {transaction.amount} C
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

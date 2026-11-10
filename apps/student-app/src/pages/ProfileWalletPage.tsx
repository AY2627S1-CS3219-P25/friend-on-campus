/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6); Google Antigravity Agent, date: 2026-10-19 to 2026-11-07
 * Scope: Extracted profile and credit wallet/ledger page from student-app App.tsx into pages/ProfileWalletPage.tsx; updated across 17 AI-assisted revisions through D4 wrap-up (apply the approved student-app consistency pass: calmer surfaces, readable type, blue actions and selection, and preserved semantic status colours).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */


import { CreditTransactionDTO, CreditWalletDTO, UserDTO } from '@campus-errand/common-dtos';
import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  Gift,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';

interface ProfileWalletPageProps {
  mode: 'profile' | 'wallet';
  profile: UserDTO | null;
  isLoadingProfile: boolean;
  profileError: { code: string; message: string } | null;
  onRefreshProfile?: () => void;
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
  onRefreshProfile,
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
      <div className="w-full max-w-4xl mx-auto space-y-4">
        <section aria-labelledby="profile-heading" className="space-y-4">
          {/* 1-Line Page Header matching Credit Wallet & Alerts */}
          <div className="flex items-center justify-between">
            <h2 id="profile-heading" className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              Student Profile
            </h2>
            <button
              type="button"
              onClick={onLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoggingOut ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500" />
              ) : (
                <LogOut className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{isLoggingOut ? 'Logging out…' : 'Log Out'}</span>
            </button>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {isLoadingProfile && (
            <div className="p-4 bg-campus-blue-soft border border-blue-100 rounded-2xl text-campus-blue text-sm flex items-center gap-2.5 shadow-card">
              <RefreshCw className="w-4 h-4 animate-spin text-campus-blue" />
              <span className="font-semibold">Loading profile details…</span>
            </div>
          )}

          {profileError && (
            <div
              role="alert"
              className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm space-y-2 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <p className="font-bold">{profileError.code}</p>
                <p className="text-xs text-rose-700">{profileError.message}</p>
              </div>
              {onRefreshProfile && (
                <button
                  type="button"
                  onClick={onRefreshProfile}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}

          {!profile && !isLoadingProfile && !profileError && (
            <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-card text-center space-y-3">
              <p className="text-sm text-slate-600 font-medium">Profile data is not loaded yet.</p>
              {onRefreshProfile && (
                <button
                  type="button"
                  onClick={onRefreshProfile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200 shadow-2xs transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Fetch Profile</span>
                </button>
              )}
            </div>
          )}

          {profile && (
            <div className="space-y-6">
              {/* Digital NUS student account Card */}
              <div className="relative overflow-hidden rounded-2xl bg-white p-6 sm:p-7 text-slate-900 shadow-card border border-slate-200/90">
                <div className="relative z-10 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold tracking-widest uppercase text-campus-blue flex items-center gap-1">
                        NUS student account
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-campus-blue-soft p-0.5 shrink-0">
                      <div className="h-full w-full rounded-[14px] bg-campus-blue-soft flex items-center justify-center text-campus-blue font-semibold text-2xl">
                        {profile.username.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 truncate">
                        {profile.username}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 truncate font-medium">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{profile.email}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Details & Username Edit Form */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-card space-y-5">
                <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900 text-base">Account Credentials</h3>
                  <span className="text-xs text-slate-500 font-medium">
                    Fields marked <span className="text-rose-600 font-bold">*</span> are required
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Username Field */}
                  <div className="space-y-1">
                    <label
                      htmlFor="profile-username"
                      className="block text-xs font-bold text-slate-700"
                    >
                      Username: <span className="text-rose-600">*</span>
                    </label>
                    <p className="text-xs text-slate-500">
                      Must be 1-50 characters and unique (case-insensitive).
                    </p>
                    {updateProfileError && (
                      <p className="text-xs text-rose-600 font-semibold">{updateProfileError.message}</p>
                    )}
                    <input
                      type="text"
                      id="profile-username"
                      value={isEditingProfile ? editUsernameDraft : profile.username}
                      disabled={!isEditingProfile || isUpdatingProfile}
                      onChange={(e) => onChangeUsernameDraft(e.target.value)}
                      className={`w-full text-sm p-3 rounded-xl border transition-all ${
                        isEditingProfile
                          ? 'border-blue-600 bg-white focus:ring-2 focus:ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    />
                  </div>

                  {/* Email Field */}
                  <div className="space-y-1">
                    <label
                      htmlFor="profile-email"
                      className="block text-xs font-bold text-slate-700"
                    >
                      Email: <span className="text-rose-600">*</span>
                    </label>
                    <p className="text-xs text-slate-500">
                      Read-only campus email address.
                    </p>
                    <input
                      type="text"
                      id="profile-email"
                      value={profile.email}
                      disabled
                      className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Edit Controls */}
                <div className="pt-2">
                  {!isEditingProfile ? (
                    <button
                      type="button"
                      onClick={onStartEditingProfile}
                      className="w-full sm:w-auto px-5 py-2.5 bg-campus-blue hover:bg-campus-blue-hover text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow-subtle transition-all cursor-pointer active:scale-[0.99]"
                    >
                      Edit Username
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={onCancelEditingProfile}
                        disabled={isUpdatingProfile}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-2xl transition disabled:opacity-50 cursor-pointer active:scale-[0.99]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={onUpdateProfile}
                        disabled={isUpdatingProfile}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-campus-blue hover:bg-campus-blue-hover text-white font-semibold text-sm rounded-xl shadow-sm hover:shadow-subtle transition-all disabled:opacity-60 cursor-pointer active:scale-[0.99]"
                      >
                        {isUpdatingProfile && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>{isUpdatingProfile ? 'Updating…' : 'Save Changes'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone: Collapsible/Isolated Account Deletion Card */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 sm:p-6 space-y-3 shadow-card">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Danger Zone: Account Deletion</span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              Permanently deletes your account, profile credentials, and associated errand history. This action is irreversible.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={onOpenDeleteAccountModal}
                disabled={!profile}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold text-rose-700 bg-white border border-rose-300 hover:bg-rose-50 hover:border-rose-400 disabled:opacity-50 shadow-2xs transition cursor-pointer active:scale-[0.99]"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete My Account</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
    );
  }

  // mode === 'wallet'
  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <section aria-labelledby="credit-heading" className="space-y-4 sm:space-y-5">
        {/* Header & Refresh */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="credit-heading" className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
              Credit Wallet
            </h2>
          </div>

          <button
            type="button"
            onClick={onRefreshCredits}
            disabled={isLoadingCredits}
            aria-label="Refresh wallet"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoadingCredits ? 'animate-spin text-campus-blue' : ''}`} />
            <span>{creditError ? 'Retry' : 'Refresh'}</span>
          </button>
        </div>

        {isLoadingCredits && (
          <p role="status" className="text-xs sm:text-sm text-slate-500 flex items-center gap-2 font-medium">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-campus-blue" />
            <span>Loading wallet and transactions…</span>
          </p>
        )}

        {creditError && (
          <p
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-700 shadow-card"
          >
            {creditError}
          </p>
        )}

        {wallet && (
          <div className="space-y-4 sm:space-y-5">
            {/* Compact Balance Card (~80px height) */}
            <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-card border border-slate-200/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
              {/* Left: Spendable Balance & Active Orders */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 shadow-2xs">
                  <Coins className="w-5 h-5 text-amber-600 fill-amber-200" />
                </div>
                <div>
                  <span className="text-xs sm:text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                    Available to spend
                  </span>
                  <div className="flex flex-wrap items-baseline gap-2.5 mt-0.5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
                        {wallet.availableCredits}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-500 normal-case tracking-normal">
                        Credits
                      </span>
                    </div>

                    {wallet.escrowCredits > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-bold shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>{wallet.escrowCredits} C in active orders</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Lifetime earned */}
              <div className="flex items-center justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 text-xs text-slate-500 font-medium">
                <span className="whitespace-nowrap">
                  Total earned: <strong className="font-bold text-slate-800">+{wallet.totalEarnedCredits} C</strong>
                </span>
              </div>
            </div>

            {/* Transaction History */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800">Recent Activity</h3>
                <span className="text-xs text-slate-500 font-medium">
                  {ledger.length} {ledger.length === 1 ? 'transaction' : 'transactions'}
                </span>
              </div>

              <div className="space-y-2.5">
                {ledger.length === 0 && (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center bg-white/70 shadow-card">
                    <p className="text-sm font-bold text-slate-700">No credit transactions yet.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Post an errand or complete deliveries to view transactions.
                    </p>
                  </div>
                )}

                {ledger.map((transaction) => {
                  const incoming =
                    transaction.transactionType === 'ESCROW_REFUND' ||
                    transaction.transactionType === 'WELCOME_GRANT' ||
                    transaction.toUserId === wallet.userId;

                  const getTransactionIcon = () => {
                    switch (transaction.transactionType) {
                      case 'WELCOME_GRANT':
                        return <Gift className="w-4 h-4 text-emerald-600" />;
                      case 'ESCROW_HOLD':
                        return <Lock className="w-4 h-4 text-amber-600" />;
                      case 'ESCROW_RELEASE':
                        return <ArrowDownRight className="w-4 h-4 text-emerald-600" />;
                      case 'ESCROW_REFUND':
                        return <RotateCcw className="w-4 h-4 text-blue-600" />;
                      default:
                        return incoming ? (
                          <ArrowDownRight className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-amber-600" />
                        );
                    }
                  };

                  const labels: Record<string, string> = {
                    WELCOME_GRANT: 'Welcome Grant',
                    ESCROW_HOLD: 'Reserved for Errand',
                    ESCROW_RELEASE: 'Delivery Reward',
                    ESCROW_REFUND: 'Refunded Credits',
                  };

                  return (
                    <div
                      key={transaction.id}
                      className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-card flex items-start justify-between gap-3 hover:shadow-card transition-all"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`h-9 w-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                            incoming ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'
                          }`}
                        >
                          {getTransactionIcon()}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <p className="font-bold text-slate-900 text-sm">
                            {labels[transaction.transactionType] || transaction.transactionType}
                          </p>
                          <p className="text-xs text-slate-600 break-words line-clamp-1">
                            {transaction.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                              {transaction.transactionCode}
                            </span>
                            <time
                              className="text-xs text-slate-500"
                              dateTime={transaction.createdAt}
                            >
                              {new Date(transaction.createdAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </time>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`text-sm sm:text-base font-semibold ${
                            incoming ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {incoming ? '+' : '−'}
                          {transaction.amount} C
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

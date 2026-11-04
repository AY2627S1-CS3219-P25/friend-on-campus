/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Redesigned NUS Student Pass card and Digital Wallet card in light elegant theme, updated action buttons to warm orange/light styles without dark button colors.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Modernized ProfileWalletPage with digital NUS student identity card, fintech-style escrow balance card, category-iconized ledger transactions, and isolated danger zone for account deletion.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted profile and credit wallet/ledger page from student-app App.tsx into pages/ProfileWalletPage.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { CreditTransactionDTO, CreditWalletDTO, UserDTO } from '@campus-errand/common-dtos';
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Gift,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
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
      <div className="w-full max-w-3xl mx-auto space-y-6">
        <section aria-labelledby="profile-heading" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="profile-heading" className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Student Profile
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                NUS student identity and account credentials
              </p>
            </div>
            {profile && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Verified Student
              </span>
            )}
          </div>

          {isLoadingProfile && (
            <div className="p-4 bg-nus-blue-50/80 border border-nus-blue-100 rounded-2xl text-nus-blue text-sm flex items-center gap-2.5 shadow-subtle">
              <RefreshCw className="w-4 h-4 animate-spin text-nus-blue" />
              <span className="font-medium">Loading profile details…</span>
            </div>
          )}

          {profileError && (
            <div
              role="alert"
              className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm space-y-2 shadow-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <p className="font-bold">{profileError.code}</p>
                <p className="text-xs text-rose-700">{profileError.message}</p>
              </div>
              {onRefreshProfile && (
                <button
                  type="button"
                  onClick={onRefreshProfile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}

          {!profile && !isLoadingProfile && !profileError && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-subtle text-center space-y-3">
              <p className="text-sm text-slate-600">Profile data is not loaded yet.</p>
              {onRefreshProfile && (
                <button
                  type="button"
                  onClick={onRefreshProfile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold border border-slate-200/90 shadow-2xs transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Fetch Profile</span>
                </button>
              )}
            </div>
          )}

          {profile && (
            <div className="space-y-6">
              {/* Digital NUS Student Pass Card */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-slate-50/80 to-blue-50/50 p-6 sm:p-7 text-slate-900 shadow-sm border border-slate-200/90">
                {/* Background ambient lighting */}
                <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-orange-300/10 blur-2xl pointer-events-none" />
                <div className="absolute -left-8 -top-8 w-44 h-44 rounded-full bg-blue-400/10 blur-2xl pointer-events-none" />

                <div className="relative z-10 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-nus-orange" />
                      <span className="text-xs font-extrabold tracking-widest uppercase text-blue-700">
                        NUS Student Pass
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 p-0.5 shadow-sm shrink-0">
                      <div className="h-full w-full rounded-[14px] bg-white flex items-center justify-center text-blue-700 font-extrabold text-2xl">
                        {profile.username.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 truncate">
                        {profile.username}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{profile.email}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-200/80 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                        Role
                      </span>
                      <span className="font-extrabold text-nus-orange text-sm mt-0.5 block">
                        {profile.userRole}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                        Status
                      </span>
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-600 text-sm mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {profile.status ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                        Affiliation
                      </span>
                      <span className="font-medium text-slate-600 text-xs mt-0.5 block">
                        National University of Singapore
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Details & Username Edit Form */}
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-subtle space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-base">Account Credentials</h3>
                  <span className="text-xs text-slate-400">
                    Fields with <span className="text-rose-600 font-bold">*</span> are compulsory
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
                    <p className="text-[11px] text-slate-400">
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
                      className={`w-full text-sm p-2.5 rounded-xl border transition ${
                        isEditingProfile
                          ? 'border-nus-blue bg-white focus:ring-2 focus:ring-nus-blue/20'
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
                    <p className="text-[11px] text-slate-400">
                      Read-only campus email address.
                    </p>
                    <input
                      type="text"
                      id="profile-email"
                      value={profile.email}
                      disabled
                      className="w-full text-sm p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Edit Controls */}
                <div className="pt-2">
                  {!isEditingProfile ? (
                    <button
                      type="button"
                      onClick={onStartEditingProfile}
                      className="w-full sm:w-auto px-5 py-2.5 bg-nus-orange hover:bg-orange-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition cursor-pointer"
                    >
                      Edit Username
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={onCancelEditingProfile}
                        disabled={isUpdatingProfile}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition disabled:opacity-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={onUpdateProfile}
                        disabled={isUpdatingProfile}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-nus-orange hover:bg-orange-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition disabled:opacity-60 cursor-pointer"
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

          {/* Session Log Out */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Session Management</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Sign out of this browser device. Your active errands will remain pending or in progress.
              </p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              disabled={isLoggingOut}
              className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-xl transition disabled:opacity-60 cursor-pointer"
            >
              {isLoggingOut ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
              ) : (
                <LogOut className="w-4 h-4 text-slate-600" />
              )}
              <span>{isLoggingOut ? 'Logging out…' : 'Log Out'}</span>
            </button>
          </div>

          {/* Danger Zone: Collapsible/Isolated Account Deletion Card */}
          <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Danger Zone: Account Deletion</span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              Permanently deletes your account and invalidates all associated records across the microservices ecosystem. This action is irreversible.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={onOpenDeleteAccountModal}
                disabled={!profile}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-white border border-rose-300 hover:bg-rose-50 hover:border-rose-400 disabled:opacity-50 shadow-sm transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete My Account</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // mode === 'wallet'
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <section aria-labelledby="credit-heading" className="space-y-6">
        {/* Header & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="credit-heading" className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Credit Wallet &amp; Ledger
              </h2>
              <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2.5 py-0.5 rounded-full">
                Saga Escrow
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Closed campus economy powered by Credit Service &amp; Escrow Saga
            </p>
          </div>

          <button
            type="button"
            onClick={onRefreshCredits}
            disabled={isLoadingCredits}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-subtle hover:bg-slate-50 disabled:opacity-50 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingCredits ? 'animate-spin text-nus-blue' : ''}`} />
            <span>{creditError ? 'Retry credits' : 'Refresh wallet'}</span>
          </button>
        </div>

        {isLoadingCredits && (
          <p role="status" className="text-xs sm:text-sm text-slate-500 flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-nus-blue" />
            <span>Loading wallet and transactions…</span>
          </p>
        )}

        {creditError && (
          <p
            role="alert"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-700 shadow-subtle"
          >
            {creditError}
          </p>
        )}

        {wallet && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Digital Wallet Card (Left / 5 columns) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-amber-50/25 to-orange-50/25 p-6 sm:p-7 text-slate-900 shadow-sm border border-slate-200/90">
                {/* Decorative glows */}
                <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-amber-300/15 blur-2xl pointer-events-none" />
                <div className="absolute -left-8 -bottom-8 w-44 h-44 rounded-full bg-blue-300/10 blur-2xl pointer-events-none" />

                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-extrabold tracking-widest text-slate-600 uppercase">
                      NUS Closed Economy
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Secured</span>
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-semibold">Total Account Value</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                        {wallet.availableCredits + wallet.escrowCredits}
                      </span>
                      <span className="text-sm text-slate-500 font-extrabold uppercase">Credits</span>
                    </div>
                  </div>

                  {/* Dual Sub-Wallets: Available vs Escrow */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/80">
                    <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-emerald-200/80 shadow-2xs">
                      <span className="text-[10px] text-emerald-700 uppercase tracking-wider block font-bold">
                        Available to Spend
                      </span>
                      <span className="text-xl font-black text-emerald-600 mt-0.5 block">
                        {wallet.availableCredits} C
                      </span>
                    </div>
                    <div className="bg-white/90 backdrop-blur-sm p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs">
                      <span className="text-[10px] text-amber-800 uppercase tracking-wider block font-bold">
                        Held in Escrow
                      </span>
                      <span className="text-xl font-black text-amber-700 mt-0.5 block">
                        {wallet.escrowCredits} C
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-slate-500 flex items-center justify-between border-t border-slate-200/60">
                    <span>Total earned to date:</span>
                    <span className="font-bold text-slate-800">+{wallet.totalEarnedCredits} C</span>
                  </div>
                </div>
              </div>

              {/* Escrow Saga Explainer Tip */}
              <div className="rounded-2xl p-4 bg-blue-50/70 border border-blue-100 text-xs text-nus-blue space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-nus-blue" />
                  <span>How Escrow Protection Works</span>
                </p>
                <p className="text-slate-600 leading-relaxed">
                  When you post an errand, reward credits are held in escrow. They are released to the courier only upon your confirmed delivery.
                </p>
              </div>
            </div>

            {/* Transaction Ledger (Right / 7 columns) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800">Recent Ledger Activity</h3>
                <span className="text-xs text-slate-500 font-medium">
                  {ledger.length} {ledger.length === 1 ? 'transaction' : 'transactions'}
                </span>
              </div>

              <div className="space-y-2.5">
                {ledger.length === 0 && (
                  <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center bg-white/60">
                    <p className="text-sm font-bold text-slate-700">No credit transactions yet.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Post an errand or complete deliveries to generate ledger entries.
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
                    ESCROW_HOLD: 'Escrow Hold',
                    ESCROW_RELEASE: 'Escrow Settlement',
                    ESCROW_REFUND: 'Escrow Refund',
                  };

                  return (
                    <div
                      key={transaction.id}
                      className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-subtle flex items-start justify-between gap-3 hover:border-slate-300 transition"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
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
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                              {transaction.transactionCode}
                            </span>
                            <time
                              className="text-[10px] text-slate-400"
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
                          className={`text-sm sm:text-base font-extrabold ${
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

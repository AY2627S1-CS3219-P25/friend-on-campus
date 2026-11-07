/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Eliminated phantom top margin on Student Profile view by isolating sr-only heading from space-y container, aligning NUS Student Pass flush with standard viewport padding.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Restored clean 1-line Credit Wallet page header with inline refresh action, paired with a compact, authoritative balance card (~85px) featuring bold available credits typography and contextual active order reservations.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Transformed Credit Wallet into an ultra space-efficient toolbar (~40px) matching AlertsPage layout, eliminating the bulky card container, guaranteeing single-line earned metrics, and bringing Recent Activity directly above the fold.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Redesigned Credit Wallet into a consumer-first single-row hero card focused strictly on Available Balance, contextual active order reservations, and integrated refresh control, removing synthetic Total Account Value and redundant title banner.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Streamlined Credit Wallet summary card into a compact 3-column stat bar (Available, In Active Orders, Total Value) and aligned header toolbar, reducing card height by ~60% and bringing transaction history above the fold.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Removed redundant metadata row (Role: STUDENT, Status: Active, Affiliation: National University of Singapore) from NUS Student Pass card.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Removed "Escrow Protected" badges, technical ledger jargon, and meta information from Credit Wallet view in favor of clean consumer balance and recent activity presentation.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Removed redundant visible Student Profile heading in favor of sr-only accessible heading, bringing the NUS Student Pass card immediately above the fold.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Removed meta indicators (Verified Student, CAMPUS-ID, microservices ecosystem reference) from profile view for clean, professional consumer presentation.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Removed backend architecture meta terms (Saga Escrow, Credit Service) in favor of consumer-facing Escrow Protected wallet language.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-06
 * Scope: Redesigned ProfileWalletPage with digital NUS student identity card, fintech-style escrow balance card with dual sub-wallets, tactile edit controls, category-iconized ledger transactions, and isolated danger zone.
 * Author review: <to be completed by yanhwee>
 *
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
      <div className="w-full max-w-3xl mx-auto">
        <section aria-labelledby="profile-heading">
          <h2 id="profile-heading" className="sr-only">
            Student Profile
          </h2>

          <div className="space-y-4 sm:space-y-6">
            {isLoadingProfile && (
            <div className="p-4 bg-nus-blue-50/80 border border-nus-blue-100 rounded-3xl text-nus-blue text-sm flex items-center gap-2.5 shadow-card">
              <RefreshCw className="w-4 h-4 animate-spin text-nus-blue" />
              <span className="font-semibold">Loading profile details…</span>
            </div>
          )}

          {profileError && (
            <div
              role="alert"
              className="p-5 bg-rose-50 border border-rose-200 rounded-3xl text-rose-800 text-sm space-y-2 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
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
            <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-card text-center space-y-3">
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
              {/* Digital NUS Student Pass Card */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-slate-50/80 to-blue-50/60 p-6 sm:p-7 text-slate-900 shadow-card border border-slate-200/90">
                {/* Background ambient lighting */}
                <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-orange-300/15 blur-2xl pointer-events-none" />
                <div className="absolute -left-8 -top-8 w-48 h-48 rounded-full bg-blue-400/15 blur-2xl pointer-events-none" />

                <div className="relative z-10 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-nus-orange animate-pulse" />
                      <span className="text-xs font-black tracking-widest uppercase text-nus-blue flex items-center gap-1">
                        NUS Student Pass
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-nus-blue via-indigo-600 to-blue-500 p-0.5 shadow-md shrink-0">
                      <div className="h-full w-full rounded-[14px] bg-white flex items-center justify-center text-nus-blue font-black text-2xl">
                        {profile.username.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 truncate">
                        {profile.username}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 truncate font-medium">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{profile.email}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Details & Username Edit Form */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-card space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="font-black text-slate-900 text-base">Account Credentials</h3>
                  <span className="text-xs text-slate-400 font-medium">
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
                      className={`w-full text-sm p-3 rounded-2xl border transition-all ${
                        isEditingProfile
                          ? 'border-nus-blue bg-white focus:ring-2 focus:ring-nus-blue/20 shadow-xs'
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
                      className="w-full text-sm p-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Edit Controls */}
                <div className="pt-2">
                  {!isEditingProfile ? (
                    <button
                      type="button"
                      onClick={onStartEditingProfile}
                      className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-nus-orange to-orange-500 hover:from-orange-600 hover:to-orange-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
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
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-nus-orange to-orange-500 hover:from-orange-600 hover:to-orange-500 text-white font-black text-xs sm:text-sm rounded-2xl shadow-sm hover:shadow-md transition-all disabled:opacity-60 cursor-pointer active:scale-[0.99]"
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
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
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
              className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm px-5 py-2.5 rounded-2xl transition disabled:opacity-60 cursor-pointer active:scale-[0.99]"
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
          <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-5 sm:p-6 space-y-3 shadow-card">
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
            <h2 id="credit-heading" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Credit Wallet
            </h2>
          </div>

          <button
            type="button"
            onClick={onRefreshCredits}
            disabled={isLoadingCredits}
            aria-label="Refresh wallet"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer active:scale-[0.99] shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingCredits ? 'animate-spin text-nus-blue' : ''}`} />
            <span>{creditError ? 'Retry' : 'Refresh'}</span>
          </button>
        </div>

        {isLoadingCredits && (
          <p role="status" className="text-xs sm:text-sm text-slate-500 flex items-center gap-2 font-medium">
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-nus-blue" />
            <span>Loading wallet and transactions…</span>
          </p>
        )}

        {creditError && (
          <p
            role="alert"
            className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-700 shadow-card"
          >
            {creditError}
          </p>
        )}

        {wallet && (
          <div className="space-y-4 sm:space-y-5">
            {/* Compact Balance Card (~80px height) */}
            <div className="rounded-3xl bg-white p-4 sm:p-5 shadow-card border border-slate-200/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
              {/* Left: Spendable Balance & Active Orders */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0 shadow-2xs">
                  <Coins className="w-5 h-5 text-amber-600 fill-amber-200" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Available to spend
                  </span>
                  <div className="flex flex-wrap items-baseline gap-2.5 mt-0.5">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {wallet.availableCredits}
                      </span>
                      <span className="text-xs sm:text-sm font-black text-slate-400 uppercase tracking-wide">
                        Credits
                      </span>
                    </div>

                    {wallet.escrowCredits > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-bold shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
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
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 p-8 text-center bg-white/70 shadow-card">
                    <p className="text-sm font-bold text-slate-700">No credit transactions yet.</p>
                    <p className="text-xs text-slate-400 mt-1">
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
                      className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/90 shadow-card flex items-start justify-between gap-3 hover:shadow-card-hover transition-all"
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
                          className={`text-sm sm:text-base font-black ${
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

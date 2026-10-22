/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Inbox wiring per the author's Notification Redesign (§2, §9, §10): opening a notification deep-links to the
 * exact errand (?tab=tasks&orderId=, fetched live from Order Service) or the wallet, toasts follow the inbox rule,
 * the Alerts page receives the REST-first hook's stale/paging state and the app's live order statuses, and the
 * confirm/cancel banners no longer claim credits were transferred or refunded. Supersedes the same-day
 * awaitingConfirmation fix.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Wired courier unassign (Drop Errand) action in App.tsx to TasksPage and forwarded optional courierContactNote on accept (F3.3.6).
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-21
 * Scope: Wired courier pickup/deliver and requester complete/cancel lifecycle handlers in App.tsx to TasksPage with action banners, credit wallet refreshes, and 400/403/409 error surfacing (Issue #132).
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Refactored monolithic student-app App.tsx into modular api/, hooks/, components/, and pages/ architecture.
 * Author review: Verified by yanhwee
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-19
 * Scope: Connect posting to the async reservation API; display saga outcomes and refresh real feed, activity and credits; remove mock suppliers and order mutations.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-19
 * Scope: Restore the two original sample errand cards alongside live orders for demos; prevent sample IDs from reaching backend actions.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Codex (model: GPT-5.6 Sol), date: 2026-10-11
 * Scope: Removed an unused logout error binding identified by the root lint configuration.
 * Author review: <to be completed by ngkhengyang>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-06
 * Scope: Notifications per the author's Notification Service Design (third pull request): the socket opens after login
 * and sends the AUTH frame (src/notifications/useNotifications.ts), an Alerts bell with the unread badge in the top nav
 * and the mobile tab bar, and an Alerts view listing notifications with mark-read (src/notifications/NotificationBell.tsx).
 * The old unauthenticated socket and SYSTEM_BROADCAST toast are gone. VITE_SHOW_WS_STATUS=false hides the "WS Hub" status line.
 * Author review: <to be completed by Reallyeasy1>
 */

// AI-generated (edited by yanhwee)

import { CreditTransactionDTO, CreditWalletDTO, NotificationDTO, OrderDTO, SupplierDTO, UserDTO } from '@campus-errand/common-dtos';
import { RefreshCw } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { fetchWalletAndLedger } from './api/credits';
import {
  acceptOrderById,
  cancelOrderById,
  completeOrderById,
  deliverOrderById,
  fetchCombinedOrders,
  FetchOrderResult,
  fetchOrderById,
  pickupOrderById,
  TaskOrderAction,
  unassignOrderById,
} from './api/orders';
import { fetchAllSuppliers } from './api/suppliers';
import {
  deleteUserAccountById,
  fetchCurrentUserProfile,
  updateCurrentUsername,
} from './api/users';
import { BottomNav } from './components/BottomNav';
import { DeleteAccountModal } from './components/DeleteAccountModal';
import { HeaderNav, StudentTab } from './components/HeaderNav';
import { useAuthSession } from './hooks/useAuthSession';
import { shouldToast } from './notifications/inbox';
import { useNotifications } from './notifications/useNotifications';
import { useOrderSubmission } from './orders/useOrderSubmission';
import { AlertsPage } from './pages/AlertsPage';
import { AuthGatePage } from './pages/AuthGatePage';
import { FeedPage } from './pages/FeedPage';
import { PostErrandFormData, PostErrandPage } from './pages/PostErrandPage';
import { ProfileWalletPage } from './pages/ProfileWalletPage';
import { SpotsPage } from './pages/SpotsPage';
import { TasksPage } from './pages/TasksPage';

// AI-generated (edited by Reallyeasy1)
// Deep link a notification can open: /?tab=tasks&orderId=<id>. Read once; the app stays tab-based otherwise.
function readDeepLink(): { tab: StudentTab | null; orderId: string | null } {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const tabs: StudentTab[] = ['feed', 'post', 'spots', 'tasks', 'alerts', 'profile', 'wallet'];
  const orderId = params.get('orderId');
  return {
    tab: tabs.includes(tab as StudentTab) ? (tab as StudentTab) : null,
    orderId: orderId && /^[0-9a-f-]{36}$/i.test(orderId) ? orderId : null,
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<StudentTab>(() => readDeepLink().tab ?? 'feed');
  // The errand a notification opened; its live state is fetched so a stale notice never shows a stale action.
  const [focusOrderId, setFocusOrderId] = useState<string | null>(() => readDeepLink().orderId);
  const [focusOrder, setFocusOrder] = useState<FetchOrderResult | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');

  // Profile Info state (GET/PATCH /api/users/me)
  const [profile, setProfile] = useState<UserDTO | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<{ code: string; message: string } | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUsernameDraft, setEditUsernameDraft] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [updateProfileError, setUpdateProfileError] = useState<{ code: string; message: string } | null>(null);

  // Delete Account state
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteAccountConfirmed, setDeleteAccountConfirmed] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<{ code: string; message: string } | null>(null);
  const [deleteAccountSuccess, setDeleteAccountSuccess] = useState(false);

  // Live Campus Suppliers State (M3)
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [isSuppliersLoading, setIsSuppliersLoading] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierError, setSupplierError] = useState<string | null>(null);

  // Credit Wallet & Ledger State
  const [wallet, setWallet] = useState<CreditWalletDTO | null>(null);
  const [ledger, setLedger] = useState<CreditTransactionDTO[]>([]);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);
  const creditRequestId = useRef(0);

  const [orders, setOrders] = useState<OrderDTO[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [acceptingOrder, setAcceptingOrder] = useState<string | null>(null);
  const [taskActionInFlight, setTaskActionInFlight] = useState<{
    orderId: string;
    action: TaskOrderAction;
  } | null>(null);
  const orderRequestId = useRef(0);

  // Post Form State
  const [formData, setFormData] = useState<PostErrandFormData>({
    supplierId: '',
    supplierName: '',
    campusZone: '',
    itemDescription: '',
    specialNotes: '',
    dropoffLocation: '',
    rewardCredits: 15,
    durationMinutes: 30,
  });

  const [notification, setNotification] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<'ok' | 'alert'>('ok');
  const keepNoticeOnTabChange = useRef(false);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 5000);
    return () => clearTimeout(timer);
  }, [notification]);
  useEffect(() => {
    if (keepNoticeOnTabChange.current) {
      keepNoticeOnTabChange.current = false;
      return;
    }
    setNotification(null);
  }, [activeTab]);

  const auth = useAuthSession(() => {
    creditRequestId.current++;
    orderRequestId.current++;
    setOrders([]);
    setOrdersError(null);
    setOrdersLoading(false);
    setAcceptingOrder(null);
    setTaskActionInFlight(null);
    setNotification(null);
    setWallet(null);
    setLedger([]);
    setCreditError(null);
    setIsLoadingCredits(false);
    setProfile(null);
    setActiveTab('feed');
  });

  const { isAuthenticated, isCheckingSession, authToken, authFetch, refreshAccessToken, currentUserId } =
    auth;

  const notifications = useNotifications({
    enabled: isAuthenticated,
    token: authToken,
    refreshToken: refreshAccessToken,
    authFetch,
    onNotification: (n) => {
      // AI-generated (edited by Reallyeasy1): quiet receipts and changes already on screen get no toast.
      if (shouldToast(n, activeTab)) {
        setNoticeTone(n.priority === 'HIGH' ? 'alert' : 'ok');
        setNotification(`🔔 ${n.title}`);
      }
      void loadOrders.current();
    },
  });
  // AI-generated (edited by Reallyeasy1)
  // The order the app has loaded is fresher than the Notification Service's projection.
  const liveStatus = (orderId: string) => orders.find((o) => o.id === orderId)?.status;
  const openNotification = (n: NotificationDTO) => {
    if (!n.readAt) void notifications.markRead(n.id);
    if (n.actionType === 'REVIEW_WALLET') {
      setActiveTab('wallet');
      return;
    }
    setFocusOrderId(n.orderId);
    setFocusOrder(null);
    setActiveTab('tasks');
    window.history.replaceState(null, '', `/?tab=tasks&orderId=${encodeURIComponent(n.orderId)}`);
  };
  const clearFocus = () => {
    setFocusOrderId(null);
    setFocusOrder(null);
    window.history.replaceState(null, '', '/');
  };
  useEffect(() => {
    if (!isAuthenticated || !focusOrderId) return;
    let cancelled = false;
    void fetchOrderById(authFetch, focusOrderId).then((result) => { if (!cancelled) setFocusOrder(result); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, focusOrderId, orders]);
  const wsStatus = notifications.status;
  const showWsStatus = import.meta.env.VITE_SHOW_WS_STATUS !== 'false';

  const fetchCredits = async () => {
    const requestId = ++creditRequestId.current;
    setIsLoadingCredits(true);
    setCreditError(null);
    setWallet(null);
    setLedger([]);
    try {
      const result = await fetchWalletAndLedger(authFetch);
      if (requestId !== creditRequestId.current) return;
      if (result.status === 'ok') {
        setWallet(result.wallet);
        setLedger(result.ledger);
      } else {
        setCreditError(result.message);
      }
    } finally {
      if (requestId === creditRequestId.current) setIsLoadingCredits(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) void fetchCredits();
    return () => {
      creditRequestId.current++;
    };
  }, [isAuthenticated, activeTab]);

  const fetchOrders = async () => {
    const requestId = ++orderRequestId.current;
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const combined = await fetchCombinedOrders(authFetch);
      if (requestId !== orderRequestId.current) return;
      setOrders(combined);
    } catch {
      if (requestId === orderRequestId.current) {
        setOrdersError('Unable to load errands. Please try again.');
      }
    } finally {
      if (requestId === orderRequestId.current) setOrdersLoading(false);
    }
  };

  const loadOrders = useRef(fetchOrders);
  loadOrders.current = fetchOrders;
  useEffect(() => {
    const requests = orderRequestId;
    if (currentUserId) void loadOrders.current();
    return () => {
      requests.current++;
    };
  }, [currentUserId, activeTab]);

  const submission = useOrderSubmission({
    userId: currentUserId,
    authFetch,
    onSettled: (receipt) => {
      void fetchCredits();
      void fetchOrders();
      if (receipt.status === 'OPEN' && receipt.orderCode) {
        keepNoticeOnTabChange.current = activeTab === 'post';
        setNoticeTone('ok');
        setNotification(`Errand ${receipt.orderCode} posted. Credits reserved.`);
        setFormData((current) => ({
          ...current,
          itemDescription: '',
          specialNotes: '',
          dropoffLocation: '',
          rewardCredits: 15,
          durationMinutes: 30,
        }));
        if (activeTab === 'post') setActiveTab('feed');
      }
    },
  });

  const fetchProfile = async () => {
    setIsLoadingProfile(true);
    setProfileError(null);
    try {
      const res = await fetchCurrentUserProfile(authFetch);
      if (res.ok) {
        setProfile(res.data);
      } else {
        setProfileError({ code: res.code, message: res.message });
      }
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const startEditingProfile = () => {
    if (!profile) return;
    setEditUsernameDraft(profile.username);
    setUpdateProfileError(null);
    setIsEditingProfile(true);
  };

  const cancelEditingProfile = () => {
    setIsEditingProfile(false);
    setUpdateProfileError(null);
    setEditUsernameDraft('');
  };

  const handleUpdateProfile = async () => {
    if (!editUsernameDraft.trim()) {
      setUpdateProfileError({ code: 'VALIDATION_ERROR', message: 'Username is required.' });
      return;
    }
    setIsUpdatingProfile(true);
    setUpdateProfileError(null);
    try {
      const res = await updateCurrentUsername(authFetch, editUsernameDraft.trim());
      if (res.ok) {
        setProfile(res.data);
        setIsEditingProfile(false);
      } else {
        setUpdateProfileError({ code: res.code, message: res.message });
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile) return;
    setIsDeletingAccount(true);
    setDeleteAccountError(null);
    try {
      const res = await deleteUserAccountById(authFetch, profile.userId);
      if (res.ok) {
        setShowDeleteAccountModal(false);
        setDeleteAccountConfirmed(false);
        setDeleteAccountSuccess(true);
      } else {
        setDeleteAccountError({ code: res.code, message: res.message });
      }
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const fetchLiveSuppliers = async () => {
    setIsSuppliersLoading(true);
    setSupplierError(null);
    try {
      const items = await fetchAllSuppliers();
      setSuppliers(items);
      setFormData((current) => {
        const selected =
          items.find((item) => item.id === current.supplierId && item.isActive) ??
          items.find((item) => item.isActive);
        return {
          ...current,
          supplierId: selected?.id ?? '',
          supplierName: selected?.name ?? '',
          campusZone: selected?.campusZone ?? '',
        };
      });
    } catch {
      setSuppliers([]);
      setSupplierError('Unable to load pickup spots. Please try again.');
    } finally {
      setIsSuppliersLoading(false);
    }
  };

  useEffect(() => {
    void fetchLiveSuppliers();
  }, []);

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submission.busy || !suppliers.some((s) => s.id === formData.supplierId && s.isActive)) {
      return;
    }
    setNotification(null);
    void submission.submit({
      supplierId: formData.supplierId,
      itemDescription: formData.itemDescription,
      specialNotes: formData.specialNotes,
      dropoffLocation: formData.dropoffLocation,
      rewardCredits: formData.rewardCredits,
      durationMinutes: Number.isFinite(formData.durationMinutes) ? formData.durationMinutes : 30,
    });
  };

  const handleAcceptOrder = async (orderId: string, courierContactNote?: string) => {
    if (acceptingOrder || taskActionInFlight) return;
    const requestId = orderRequestId.current;
    setAcceptingOrder(orderId);
    setOrdersError(null);
    try {
      const updated = await acceptOrderById(authFetch, orderId, courierContactNote);
      if (requestId !== orderRequestId.current) return;
      setOrders((current) => current.map((order) => (order.id === orderId ? updated : order)));
      setNoticeTone('ok');
      setNotification('Errand accepted! Head to the pickup location.');
    } catch (error) {
      if (requestId === orderRequestId.current) {
        setOrdersError(
          error instanceof Error ? error.message : 'Unable to accept this errand.'
        );
      }
    } finally {
      setAcceptingOrder(null);
    }
  };

  const handleTaskOrderAction = async (orderId: string, action: TaskOrderAction) => {
    if (taskActionInFlight || acceptingOrder) return;
    const requestId = orderRequestId.current;
    setTaskActionInFlight({ orderId, action });
    setOrdersError(null);
    try {
      let updated: OrderDTO;
      let successMessage: string;
      switch (action) {
        case 'pickup':
          updated = await pickupOrderById(authFetch, orderId);
          successMessage = 'Item picked up! Head to dropoff location.';
          break;
        case 'deliver':
          updated = await deliverOrderById(authFetch, orderId);
          successMessage = 'Item marked as delivered! Awaiting requester confirmation.';
          break;
        case 'complete':
          updated = await completeOrderById(authFetch, orderId);
          // AI-generated (edited by Reallyeasy1): the payment is Credit Service's commit, not this one.
          successMessage = 'Delivery confirmed. The courier is paid once Credit Service settles the escrow.';
          break;
        case 'cancel':
          updated = await cancelOrderById(authFetch, orderId);
          successMessage = 'Errand cancelled. Reserved credits are returned once Credit Service processes it.';
          break;
        case 'unassign':
          updated = await unassignOrderById(authFetch, orderId);
          successMessage = 'Errand dropped and returned to the open feed.';
          break;
      }
      if (requestId !== orderRequestId.current) return;
      setOrders((current) => current.map((order) => (order.id === orderId ? updated : order)));
      setNoticeTone('ok');
      setNotification(successMessage);
      if (action === 'complete' || action === 'cancel') {
        void fetchCredits();
        setTimeout(() => {
          if (isAuthenticated) void fetchCredits();
        }, 600);
      }
    } catch (error) {
      if (requestId === orderRequestId.current) {
        setOrdersError(
          error instanceof Error ? error.message : 'Unable to update this errand.'
        );
      }
    } finally {
      setTaskActionInFlight(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (o.status !== 'OPEN' || o.requesterId === currentUserId) return false;
    if (selectedZone === 'ALL') return true;
    return o.campusZone === selectedZone;
  });

  const activeSuppliers = suppliers.filter((s) => s.isActive);

  const filteredSuppliers = suppliers.filter((s) => {
    const q = supplierSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.campusZone.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.exactLocation.toLowerCase().includes(q)
    );
  });

  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <RefreshCw className="w-6 h-6 text-nus-blue animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthGatePage
        authView={auth.authView}
        setAuthView={auth.setAuthView}
        loginEmail={auth.loginEmail}
        setLoginEmail={auth.setLoginEmail}
        loginPassword={auth.loginPassword}
        setLoginPassword={auth.setLoginPassword}
        rememberMe={auth.rememberMe}
        setRememberMe={auth.setRememberMe}
        isLoggingIn={auth.isLoggingIn}
        loginError={auth.loginError}
        setLoginError={auth.setLoginError}
        onLoginSubmit={auth.handleLogin}
        signupData={auth.signupData}
        setSignupData={auth.setSignupData}
        isSigningUp={auth.isSigningUp}
        signupError={auth.signupError}
        setSignupError={auth.setSignupError}
        onSignupSubmit={auth.handleSignup}
      />
    );
  }

  const openProfileTab = () => {
    setActiveTab('profile');
    void fetchProfile();
  };

  return (
    <div className="student-shell flex flex-col min-h-dvh w-full bg-slate-50 text-slate-900 relative font-sans">
      <HeaderNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenProfile={openProfileTab}
        unreadNotificationsCount={notifications.unreadCount}
        wallet={wallet}
        isLoadingCredits={isLoadingCredits}
        showWsStatus={showWsStatus}
        wsStatus={wsStatus}
      />

      {notification && (
        <div
          role="status"
          data-testid="action-notice"
          className={`${noticeTone === 'alert' ? 'bg-amber-600' : 'bg-emerald-600'} text-white text-sm px-4 py-2 text-center font-medium shadow-md transition-all`}
        >
          {notification}
        </div>
      )}

      <main className="student-main flex-1 min-w-0 px-4 pt-4 md:px-6 md:pt-6 lg:px-8 lg:pt-8">
        {(submission.unconfirmed ||
          (submission.receipt && submission.receipt.status !== 'OPEN')) && (
          <div
            role="status"
            data-testid="order-submission-status"
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            {submission.unconfirmed &&
              'Awaiting confirmation. Your errand may still be pending and could become open. We could not confirm its status because the submission response was not received. Please wait before trying again; submitting again could create a duplicate errand.'}
            {submission.receipt?.status === 'PENDING' &&
              'Pending — waiting to open. We are reserving your credits. Your errand will appear once the reservation is confirmed. Please wait and do not submit this errand again.'}
            {submission.receipt?.status === 'EXPIRED' &&
              'Your submission expired and your reserved credits are being returned. You can submit a new errand.'}
            {submission.receipt?.status === 'REJECTED' &&
              `Errand not posted: ${
                submission.receipt.rejectionReason || 'Credit reservation was declined.'
              }`}
          </div>
        )}
        {submission.error && (
          <div
            role="alert"
            className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700"
          >
            {submission.error}
          </div>
        )}
        {ordersError && (activeTab === 'feed' || activeTab === 'tasks') && (
          <div role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            {ordersError}{' '}
            <button onClick={() => void fetchOrders()} className="font-bold underline">
              Retry loading errands
            </button>
          </div>
        )}
        {supplierError && (activeTab === 'post' || activeTab === 'spots') && (
          <div role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            {supplierError}{' '}
            <button onClick={() => void fetchLiveSuppliers()} className="font-bold underline">
              Retry loading pickup spots
            </button>
          </div>
        )}

        {activeTab === 'feed' && (
          <FeedPage
            filteredOrders={filteredOrders}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
            ordersLoading={ordersLoading}
            ordersError={ordersError}
            currentUserId={currentUserId}
            acceptingOrderId={acceptingOrder}
            onAcceptOrder={handleAcceptOrder}
          />
        )}

        {activeTab === 'post' && (
          <PostErrandPage
            formData={formData}
            setFormData={setFormData}
            suppliers={suppliers}
            activeSuppliers={activeSuppliers}
            isSuppliersLoading={isSuppliersLoading}
            wallet={wallet}
            submissionBusy={submission.busy}
            submissionPosting={submission.posting}
            onSubmit={handlePostSubmit}
          />
        )}

        {activeTab === 'spots' && (
          <SpotsPage
            filteredSuppliers={filteredSuppliers}
            supplierSearch={supplierSearch}
            onChangeSearch={setSupplierSearch}
            isSuppliersLoading={isSuppliersLoading}
            onPickForErrand={(s) => {
              setFormData((prev) => ({
                ...prev,
                supplierId: s.id,
                supplierName: s.name,
                campusZone: s.campusZone,
              }));
              setActiveTab('post');
            }}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksPage
            orders={orders}
            currentUserId={currentUserId}
            ordersLoading={ordersLoading}
            actingOrderId={taskActionInFlight?.orderId ?? null}
            actingAction={taskActionInFlight?.action ?? null}
            onRefreshOrders={() => void fetchOrders()}
            onPickupOrder={(orderId) => void handleTaskOrderAction(orderId, 'pickup')}
            onDeliverOrder={(orderId) => void handleTaskOrderAction(orderId, 'deliver')}
            onCompleteOrder={(orderId) => void handleTaskOrderAction(orderId, 'complete')}
            onCancelOrder={(orderId) => void handleTaskOrderAction(orderId, 'cancel')}
            onUnassignOrder={(orderId) => void handleTaskOrderAction(orderId, 'unassign')}
            focusOrderId={focusOrderId}
            focusOrder={focusOrder}
            onClearFocus={clearFocus}
          />
        )}

        {activeTab === 'alerts' && (
          <AlertsPage
            items={notifications.items}
            unreadCount={notifications.unreadCount}
            isLoading={notifications.isLoading}
            stale={notifications.stale}
            error={notifications.error}
            hasMore={notifications.hasMore}
            liveStatus={liveStatus}
            onMarkRead={notifications.markRead}
            onMarkAllRead={notifications.markAllRead}
            onRefresh={notifications.refresh}
            onLoadMore={notifications.loadMore}
            onOpen={openNotification}
          />
        )}

        {(activeTab === 'profile' || activeTab === 'wallet') && (
          <ProfileWalletPage
            mode={activeTab}
            profile={profile}
            isLoadingProfile={isLoadingProfile}
            profileError={profileError}
            isEditingProfile={isEditingProfile}
            editUsernameDraft={editUsernameDraft}
            onChangeUsernameDraft={setEditUsernameDraft}
            isUpdatingProfile={isUpdatingProfile}
            updateProfileError={updateProfileError}
            onStartEditingProfile={startEditingProfile}
            onCancelEditingProfile={cancelEditingProfile}
            onUpdateProfile={handleUpdateProfile}
            onLogout={auth.handleLogout}
            isLoggingOut={auth.isLoggingOut}
            onOpenDeleteAccountModal={() => {
              setShowDeleteAccountModal(true);
              setDeleteAccountConfirmed(false);
              setDeleteAccountError(null);
            }}
            wallet={wallet}
            ledger={ledger}
            isLoadingCredits={isLoadingCredits}
            creditError={creditError}
            onRefreshCredits={() => void fetchCredits()}
          />
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenProfile={openProfileTab}
        unreadNotificationsCount={notifications.unreadCount}
      />

      <DeleteAccountModal
        showConfirmModal={showDeleteAccountModal}
        confirmed={deleteAccountConfirmed}
        onToggleConfirmed={setDeleteAccountConfirmed}
        isDeleting={isDeletingAccount}
        error={deleteAccountError}
        onCancel={() => {
          setShowDeleteAccountModal(false);
          setDeleteAccountConfirmed(false);
          setDeleteAccountError(null);
        }}
        onConfirmDelete={handleDeleteAccount}
        showSuccessModal={deleteAccountSuccess}
        onReturnToLogin={() => {
          setDeleteAccountSuccess(false);
          auth.clearLocalSession();
        }}
      />
    </div>
  );
}

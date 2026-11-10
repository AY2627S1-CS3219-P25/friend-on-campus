/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent; Claude Code (model: Claude Fable 5.1, Claude Opus 5.5, Claude Sonnet 5.5); Codex (model: GPT-6, GPT-5.6 Sol), date: 2026-10-06 to 2026-11-10
 * Scope: Notifications per the author's Notification Service Design (third pull request): the socket opens after login and sends the AUTH frame..; updated across 32 AI-assisted revisions through D4 wrap-up (require closed-store confirmation in handleOrderAgain (#234) and revalidate the supplier directory when navigating to the Post or Places tabs (#171)).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */


import { CreditTransactionDTO, CreditWalletDTO, NotificationDTO, OrderDTO, SupplierDTO, UserDTO } from '@campus-errand/common-dtos';
import { RefreshCw } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { fetchWalletAndLedger } from './api/credits';
import {
  acceptOrderById,
  cancelOrderById,
  completeOrderById,
  disputeOrderById,
  courierDisputeOrderById,
  deliverOrderById,
  fetchCombinedOrders,
  fetchOrderById,
  FetchOrderResult,
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
import { useChat } from './chat/useChat';
import { BottomNav } from './components/BottomNav';
import { DeleteAccountModal } from './components/DeleteAccountModal';
import { HeaderNav, StudentTab } from './components/HeaderNav';
import { ErrandDetailsPage } from './errand/ErrandDetailsPage';
import { describeWriteFailure, useAuthSession } from './hooks/useAuthSession';
import { estimateRewardCredits, supplierPoint } from './map/creditEstimate';
import { NUS_SPAN_KM } from './map/nusBuildings';
import { shouldToast } from './notifications/inbox';
import { useNotifications } from './notifications/useNotifications';
import { feedOrders, inFeedZone } from './orders/feedZones';
import { buildReorderRequest, confirmReorderWhenStoreClosed } from './orders/reorder';
import { useOrderSubmission } from './orders/useOrderSubmission';
import { AlertsPage } from './pages/AlertsPage';
import { AuthGatePage } from './pages/AuthGatePage';
import { FeedPage } from './pages/FeedPage';
import { PostErrandFormData, PostErrandPage } from './pages/PostErrandPage';
import { ProfileWalletPage } from './pages/ProfileWalletPage';
import { SpotsPage } from './pages/SpotsPage';
import { TasksPage } from './pages/TasksPage';

/** How often the Feed re-reads the open errands while it is on screen (no push exists for new postings). */
const FEED_POLL_MS = 15_000;

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
  // The page's manual reload, and the list's scroll offset to return to.
  const [reloadKey, setReloadKey] = useState(0);
  // Failures of the page's actions (service 400 / 403 / 409 text), kept apart from the list poll's ordersError.
  const [actionError, setActionError] = useState<string | null>(null);
  const savedScroll = useRef<number | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');

  // Profile Info state (GET/PATCH /api/users/me)
  const [profile, setProfile] = useState<UserDTO | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<{ code: string; message: string } | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUsernameDraft, setEditUsernameDraft] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [updateProfileError, setUpdateProfileError] = useState<{ code: string; message: string } | null>(null);
  const profileRequestId = useRef(0);

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
    dropoffPoint: null,
    rewardEdited: false,
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
    profileRequestId.current++;
    setOrders([]);
    setOrdersError(null);
    setOrdersLoading(false);
    setAcceptingOrder(null);
    setTaskActionInFlight(null);
    setFocusOrderId(null);
    setFocusOrder(null);
    setActionError(null);
    setNotification(null);
    setWallet(null);
    setLedger([]);
    setCreditError(null);
    setIsLoadingCredits(false);
    setProfile(null);
    setProfileError(null);
    setIsLoadingProfile(false);
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
      // Quiet receipts and changes already on screen get no toast.
      if (shouldToast(n, activeTab)) {
        setNoticeTone(n.priority === 'HIGH' ? 'alert' : 'ok');
        setNotification(`🔔 ${n.title}`);
      }
      void loadOrders.current();
    },
  });
  // The order the app has loaded is fresher than the Notification Service's projection.
  const liveStatus = (orderId: string) => orders.find((o) => o.id === orderId)?.status;
  const openNotification = (n: NotificationDTO) => {
    if (!n.readAt) void notifications.markRead(n.id);
    if (n.actionType === 'REVIEW_WALLET') {
      selectTab('wallet');
      return;
    }
    openErrand(n.orderId, 'tasks');
  };
  // The details page (#188) is the existing deep link made navigable: opening pushes /?tab=&orderId= so Back returns
  // to the tab the card was on; closing pops that entry when it exists, else rewrites the URL in place. The list
  // entry's URL is first synchronised with the tab the user is on (Alerts included), so history itself carries the
  // origin and Back → Forward → Back or a refresh land on the same tab (PR #190 review).
  const openErrand = (orderId: string, tab: 'feed' | 'tasks') => {
    savedScroll.current = window.scrollY;
    window.history.replaceState(null, '', `/?tab=${activeTab}`);
    setActiveTab(tab);
    setFocusOrderId(orderId);
    setFocusOrder(null);
    setActionError(null);
    window.history.pushState({ errand: orderId }, '', `/?tab=${tab}&orderId=${encodeURIComponent(orderId)}`);
    window.scrollTo(0, 0);
  };
  const closeErrand = () => {
    if ((window.history.state as { errand?: string } | null)?.errand) {
      window.history.back(); // popstate below clears the focus
      return;
    }
    setFocusOrderId(null);
    setFocusOrder(null);
    window.history.replaceState(null, '', `/?tab=${activeTab}`);
  };
  const reloadErrand = () => {
    setFocusOrder(null);
    setActionError(null);
    setReloadKey((k) => k + 1);
  };
  // A nav tab tapped while an errand page is open leaves the page; the URL always follows the tab, so a later Back
  // from a details page returns here.
  const selectTab = (tab: StudentTab) => {
    if (focusOrderId) {
      savedScroll.current = null;
      setFocusOrderId(null);
      setFocusOrder(null);
    }
    window.history.replaceState(null, '', `/?tab=${tab}`);
    setActiveTab(tab);
  };
  useEffect(() => {
    const onPopState = () => {
      // Every history entry carries its tab in the URL (openErrand and selectTab keep it in sync).
      const link = readDeepLink();
      setActiveTab((current) => link.tab ?? current);
      setFocusOrderId(link.orderId);
      setFocusOrder(null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  useEffect(() => {
    if (focusOrderId !== null || savedScroll.current === null) return;
    window.scrollTo(0, savedScroll.current);
    savedScroll.current = null;
  }, [focusOrderId]);
  useEffect(() => {
    if (!isAuthenticated || !focusOrderId) return;
    let cancelled = false;
    void fetchOrderById(authFetch, focusOrderId).then((result) => { if (!cancelled) setFocusOrder(result); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, focusOrderId, orders, reloadKey]);
  const wsStatus = notifications.status;
  // The chat socket (F8) beside the notification socket.
  const chat = useChat({ enabled: isAuthenticated, token: authToken, refreshToken: refreshAccessToken, authFetch });
  const showWsStatus = import.meta.env.VITE_SHOW_WS_STATUS !== 'false';

  const walletRef = useRef(wallet);
  walletRef.current = wallet;

  // Quiet background revalidation prevents credit flickering on tab navigation
  // by keeping existing wallet/ledger state in memory instead of clearing it before the fetch settles.
  const fetchCredits = async (quiet = Boolean(walletRef.current)) => {
    const requestId = ++creditRequestId.current;
    if (!quiet) {
      setIsLoadingCredits(true);
      setCreditError(null);
    }
    try {
      const result = await fetchWalletAndLedger(authFetch);
      if (requestId !== creditRequestId.current) return;
      if (result.status === 'ok') {
        setWallet(result.wallet);
        setLedger(result.ledger);
        if (quiet) setCreditError(null);
      } else {
        setCreditError(result.message);
      }
    } finally {
      if (requestId === creditRequestId.current && !quiet) setIsLoadingCredits(false);
    }
  };

  // Same shape as the orders effect below. The latest fetchCredits is read from a
  // ref (it closes over authFetch and setters, so listing it would refetch on every render) and the request counter is
  // bumped on cleanup so a response from the previous tab or session is ignored.
  const loadCredits = useRef(fetchCredits);
  loadCredits.current = fetchCredits;
  useEffect(() => {
    const requests = creditRequestId;
    if (isAuthenticated) void loadCredits.current();
    return () => {
      requests.current++;
    };
  }, [isAuthenticated, activeTab]);

  // A quiet reload keeps the list on screen (no "Loading errands…", no error
  // banner) for polls, and a list that started before a local change (accept, pickup, …) is dropped as stale so it
  // cannot overwrite that change (PR #196 review).
  const ordersMutatedAt = useRef(0);
  // A retrying load can outlast the 15 s poll interval, and each new load
  // supersedes the previous request id; a quiet poll therefore waits while any load is in flight, otherwise a Feed
  // facing a flapping Order Service never settles on an error or a result (PR #225 review, P2).
  const ordersLoadsInFlight = useRef(0);
  const fetchOrders = async (quiet = false) => {
    if (quiet && ordersLoadsInFlight.current > 0) return;
    const requestId = ++orderRequestId.current;
    const startedAt = Date.now();
    ordersLoadsInFlight.current++;
    if (!quiet) {
      setOrdersLoading(true);
      setOrdersError(null);
    }
    try {
      const combined = await fetchCombinedOrders(authFetch);
      if (requestId !== orderRequestId.current || ordersMutatedAt.current >= startedAt) return;
      setOrders(combined);
    } catch {
      if (!quiet && requestId === orderRequestId.current) {
        setOrdersError('Unable to load errands. Please try again.');
      }
    } finally {
      ordersLoadsInFlight.current--;
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

  // Couriers get no alert when an errand is posted (Notification Service's
  // order.created goes to the requester only), so the Feed polls while it is on screen and the tab is visible.
  // ponytail: a 15 s poll of the two list calls; a courier-side push would need a new notification recipient.
  const feedOnScreen = Boolean(currentUserId) && !focusOrderId && activeTab === 'feed';
  useEffect(() => {
    if (!feedOnScreen) return;
    const tick = () => { if (document.visibilityState === 'visible') void loadOrders.current(true); };
    const timer = setInterval(tick, FEED_POLL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [feedOnScreen]);

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
          dropoffPoint: null,
          rewardEdited: false,
        }));
        if (activeTab === 'post') setActiveTab('feed');
      } else if (receipt.status === 'REJECTED') {
        keepNoticeOnTabChange.current = activeTab === 'post';
        setNoticeTone('alert');
        setNotification(
          `Errand posting rejected: ${receipt.rejectionReason || 'Credit reservation failed or insufficient funds.'}`
        );
      } else if (receipt.status === 'CANCELLED' || receipt.status === 'EXPIRED') {
        keepNoticeOnTabChange.current = activeTab === 'post';
        setNoticeTone('alert');
        setNotification('Errand posting was cancelled or expired.');
      }
    },
  });

  // The counter is bumped on session clear, so a profile that belongs to the
  // account that signed out (including one returned by a retry) never lands on the next account's screen.
  const fetchProfile = async () => {
    const requestId = ++profileRequestId.current;
    setIsLoadingProfile(true);
    setProfileError(null);
    try {
      const res = await fetchCurrentUserProfile(authFetch);
      if (requestId !== profileRequestId.current) return;
      if (res.ok) {
        setProfile(res.data);
      } else {
        setProfileError({ code: res.code, message: res.message });
      }
    } finally {
      if (requestId === profileRequestId.current) setIsLoadingProfile(false);
    }
  };

  const loadProfile = useRef(fetchProfile);
  loadProfile.current = fetchProfile;
  useEffect(() => {
    if (isAuthenticated && (activeTab === 'profile' || activeTab === 'wallet')) {
      void loadProfile.current();
    }
  }, [isAuthenticated, activeTab]);

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

  const fetchLiveSuppliers = async (options: { quiet?: boolean } = {}) => {
    const quiet = Boolean(options.quiet && suppliers.length > 0);
    if (!quiet) {
      setIsSuppliersLoading(true);
      setSupplierError(null);
    }
    try {
      const items = await fetchAllSuppliers();
      setSuppliers(items);
      setSupplierError(null);
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
      if (!quiet) {
        setSuppliers([]);
        setSupplierError('Unable to load pickup spots. Please try again.');
      }
    } finally {
      if (!quiet) {
        setIsSuppliersLoading(false);
      }
    }
  };

  useEffect(() => {
    void fetchLiveSuppliers();
  }, []);

  // Revalidate pickup spots when opening Post Errand or Places so admin status toggles take effect without a full page reload (issue #171).
  useEffect(() => {
    if (isAuthenticated && (activeTab === 'post' || activeTab === 'spots')) {
      void fetchLiveSuppliers({ quiet: true });
    }
  }, [isAuthenticated, activeTab]);

  // "Order again" posts a new errand with the details of a completed one.
  const handleOrderAgain = (order: OrderDTO) => {
    if (submission.busy) return;
    if (wallet && order.rewardCredits > wallet.availableCredits) {
      setNoticeTone('alert');
      setNotification(
        `Insufficient credits: this errand offers ${order.rewardCredits} C, but you only have ${wallet.availableCredits} C available.`
      );
      return;
    }
    // Require confirmation when the pickup store is outside operating hours (issue #234).
    if (!confirmReorderWhenStoreClosed(order, suppliers)) {
      return;
    }
    setNotification(null);
    void submission.submit(buildReorderRequest(order));
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submission.busy || !suppliers.some((s) => s.id === formData.supplierId && s.isActive)) {
      return;
    }
    if (wallet && formData.rewardCredits > wallet.availableCredits) {
      setNoticeTone('alert');
      setNotification(
        `Insufficient credits: You offered ${formData.rewardCredits} C, but you only have ${wallet.availableCredits} C available.`
      );
      return;
    }
    setNotification(null);
    const dropoffPoint = formData.dropoffPoint;
    const estimatedRewardCredits = estimateRewardCredits(
      supplierPoint(suppliers.find((s) => s.id === formData.supplierId)),
      dropoffPoint,
      NUS_SPAN_KM
    );
    void submission.submit({
      supplierId: formData.supplierId,
      itemDescription: formData.itemDescription,
      specialNotes: formData.specialNotes,
      dropoffLocation: formData.dropoffLocation,
      rewardCredits: formData.rewardCredits,
      durationMinutes: Number.isFinite(formData.durationMinutes) ? formData.durationMinutes : 30,
      ...(dropoffPoint && estimatedRewardCredits !== null
        ? {
          dropoffLatitude: dropoffPoint.latitude,
          dropoffLongitude: dropoffPoint.longitude,
          estimatedRewardCredits,
        }
        : {}),
    });
  };

  const handleAcceptOrder = async (orderId: string, courierContactNote?: string) => {
    if (acceptingOrder || taskActionInFlight) return;
    const requestId = orderRequestId.current;
    setAcceptingOrder(orderId);
    setActionError(null);
    try {
      const updated = await acceptOrderById(authFetch, orderId, courierContactNote);
      if (requestId !== orderRequestId.current) return;
      ordersMutatedAt.current = Date.now();
      setOrders((current) => current.map((order) => (order.id === orderId ? updated : order)));
      setNoticeTone('ok');
      setNotification('Errand accepted! Head to the pickup location.');
    } catch (error) {
      if (requestId === orderRequestId.current) {
        setActionError(describeWriteFailure(error, 'Unable to accept this errand.'));
      }
    } finally {
      setAcceptingOrder(null);
    }
  };

  const handleTaskOrderAction = async (orderId: string, action: TaskOrderAction, details?: string) => {
    if (taskActionInFlight || acceptingOrder) return;
    const requestId = orderRequestId.current;
    setTaskActionInFlight({ orderId, action });
    setActionError(null);
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
          successMessage = 'Delivery confirmed! The courier payout has been initiated.';
          break;
        case 'dispute':
          updated = await disputeOrderById(authFetch, orderId, details ?? '');
          successMessage = 'Dispute raised. An administrator will review it; the credits stay held until then.';
          break;
        case 'courier-dispute':
          updated = await courierDisputeOrderById(authFetch, orderId, details ?? '');
          successMessage = 'Your dispute report was submitted. An administrator will review both sides.';
          break;
        case 'cancel':
          updated = await cancelOrderById(authFetch, orderId);
          successMessage = 'Errand cancelled. Reserved credits have been returned to your wallet.';
          break;
        case 'unassign':
          updated = await unassignOrderById(authFetch, orderId);
          successMessage = 'Errand dropped and returned to the open feed.';
          break;
      }
      if (requestId !== orderRequestId.current) return;
      ordersMutatedAt.current = Date.now();
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
        setActionError(describeWriteFailure(error, 'Unable to update this errand.'));
      }
    } finally {
      setTaskActionInFlight(null);
    }
  };

  // The whole feed goes to FeedPage for the tab counts; only the cards are
  // narrowed to the selected tab.
  const feed = feedOrders(orders, currentUserId);
  const filteredOrders = feed.filter((o) => inFeedZone(o, selectedZone));

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
    selectTab('profile');
    void fetchProfile();
  };

  // While an errand is open its page stands in for the tab's content.
  const page: StudentTab | null = focusOrderId ? null : activeTab;

  return (
    <div className="student-shell flex flex-col min-h-dvh w-full bg-campus-canvas text-slate-900 relative font-sans">
      <HeaderNav
        activeTab={activeTab}
        onSelectTab={selectTab}
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

      <main className="student-main flex-1 min-w-0 px-3.5 pt-3.5 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] sm:px-6 md:pt-4 lg:pb-10 lg:px-8">
        <div className="w-full max-w-7xl mx-auto">
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
        {ordersError && (page === 'feed' || page === 'tasks') && (
          <div role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            {ordersError}{' '}
            <button onClick={() => void fetchOrders()} className="font-bold underline">
              Retry loading errands
            </button>
          </div>
        )}
        {supplierError && (page === 'post' || page === 'spots') && (
          <div role="alert" className="mb-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
            {supplierError}{' '}
            <button onClick={() => void fetchLiveSuppliers()} className="font-bold underline">
              Retry loading pickup spots
            </button>
          </div>
        )}

        {focusOrderId && (
          <ErrandDetailsPage
            orderId={focusOrderId}
            result={focusOrder}
            currentUserId={currentUserId}
            chat={chat}
            onBack={closeErrand}
            onReload={reloadErrand}
            actingAction={
              acceptingOrder === focusOrderId ? 'accept' : taskActionInFlight?.orderId === focusOrderId ? taskActionInFlight.action : null
            }
            actionError={actionError}
            onAccept={(orderId, note) => void handleAcceptOrder(orderId, note)}
            onAction={(orderId, action, details) => void handleTaskOrderAction(orderId, action, details)}
            supplier={
              focusOrder?.status === 'ok'
                ? suppliers.find((s) => s.id === focusOrder.order.supplierId) ?? null
                : null
            }
          />
        )}

        {page === 'feed' && (
          <FeedPage
            feedOrders={feed}
            filteredOrders={filteredOrders}
            selectedZone={selectedZone}
            onSelectZone={setSelectedZone}
            ordersLoading={ordersLoading}
            ordersError={ordersError}
            currentUserId={currentUserId}
            onOpenErrand={(orderId) => openErrand(orderId, 'feed')}
          />
        )}

        {page === 'post' && (
          <PostErrandPage
            formData={formData}
            setFormData={setFormData}
            suppliers={suppliers}
            activeSuppliers={activeSuppliers}
            isSuppliersLoading={isSuppliersLoading}
            wallet={wallet}
            submissionBusy={submission.busy}
            submissionPosting={submission.posting}
            submissionError={submission.error}
            submissionUnconfirmed={submission.unconfirmed}
            onSubmit={handlePostSubmit}
            authFetch={authFetch}
          />
        )}

        {page === 'spots' && (
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

        {page === 'tasks' && (
          <TasksPage
            orders={orders}
            currentUserId={currentUserId}
            ordersLoading={ordersLoading}
            onRefreshOrders={() => void fetchOrders()}
            onOpenErrand={(orderId) => openErrand(orderId, 'tasks')}
            onOrderAgain={handleOrderAgain}
            orderAgainBusy={submission.busy}
          />
        )}

        {page === 'alerts' && (
          <AlertsPage
            items={notifications.items}
            unreadCount={notifications.unreadCount}
            total={notifications.total}
            view={notifications.view}
            onViewChange={notifications.setView}
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

        {(page === 'profile' || page === 'wallet') && (
          <ProfileWalletPage
            mode={page}
            profile={profile}
            isLoadingProfile={isLoadingProfile}
            profileError={profileError}
            onRefreshProfile={() => void fetchProfile()}
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
            onRefreshCredits={() => void fetchCredits(false)}
          />
        )}
        </div>
      </main>

      <BottomNav
        activeTab={activeTab}
        onSelectTab={selectTab}
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

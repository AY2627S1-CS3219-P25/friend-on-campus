/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-24
 * Scope: Review fixes (PR #184): the hook owns the selected view and fetches it from the server (view=/unread= query)
 * instead of filtering loaded All rows, so an older Important/Action/Unread row is never hidden behind an empty state;
 * a refresh re-reads every loaded page (1..n) rather than page 1 alone, so arrivals that shift offset pages while the
 * socket was down are caught up and read state on older pages is reconciled; exposes total for the active view.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: REST-first inbox per the author's Notification Redesign (§10): history loads as soon as the student is logged
 * in (not after AUTH_OK), refreshes on reconnect, focus, visibility and every 30 s while visible (backing off after
 * failures), pages with loadMore(), merges rows by id so a duplicate frame cannot bump the badge, takes unread counts
 * only from the server, refetches on INBOX_CHANGED, and keeps old rows with a stale flag when a refresh fails.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-06
 * Scope: Client side of the Notification Service's WebSocket and REST contract, per the author's Notification Service
 * Design (third pull request): AUTH frame after login, reconnect with backoff, history over REST, mark read.
 * Review fix the same day: a 4401 before AUTH_OK (token rejected outright, e.g. mismatched keys) backs off like any
 * other close instead of looping refresh -> connect -> 4401 with no pause.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { useCallback, useEffect, useRef, useState } from 'react';
import type { NotificationDTO, NotificationPageDTO } from '@campus-errand/common-dtos';
import { applyPages, inboxQuery, mergeNotifications, type InboxView } from './inbox';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected';

/** The server closes a socket with this code for a missing, bad or expired token. */
const UNAUTHORIZED = 4401;
const MAX_BACKOFF_MS = 30_000;
const PAGE_SIZE = 50;
const RECONCILE_MS = 30_000;
const RECONCILE_MAX_MS = 5 * 60_000;

export function useNotifications(options: {
  /** Open the socket only while logged in. */
  enabled: boolean;
  /** The current access token; the hook always sends the latest one. */
  token: string;
  refreshToken: () => Promise<string | null>;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onNotification?: (notification: NotificationDTO) => void;
}) {
  const [status, setStatus] = useState<SocketStatus>('disconnected');
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<NotificationDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  // AI-generated (edited by Reallyeasy1): the view is fetched, not filtered client side, so the hook owns it.
  const [view, setView] = useState<InboxView>('all');
  /** Rows the server has for the current view; the authoritative count for the active tab. */
  const [total, setTotal] = useState(0);

  // Refs so the socket callbacks see the latest token and helpers without reconnecting on every render.
  const latest = useRef(options);
  latest.current = options;
  const currentView = useRef(view);
  currentView.current = view;
  const pagesLoaded = useRef(0);
  const inFlight = useRef(false);
  const rerun = useRef(false);
  const failures = useRef(0);

  const fetchPage = useCallback(async (page: number): Promise<NotificationPageDTO> => {
    const res = await latest.current.authFetch(`/api/notifications?${inboxQuery(currentView.current, page, PAGE_SIZE)}`);
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error ?? `HTTP ${res.status}`);
    return data.data as NotificationPageDTO;
  }, []);

  const apply = useCallback((pages: NotificationPageDTO[]) => {
    const next = applyPages([], pages);
    setItems((current) => applyPages(current, pages).items);
    setUnreadCount(next.unreadCount);
    setTotal(next.total);
    setHasMore(next.hasMore);
    pagesLoaded.current = next.pagesLoaded;
  }, []);

  // Serialized: one refresh at a time, and a request that arrives mid-flight runs once more afterwards so a socket
  // hint that landed during the fetch is never lost.
  const refresh = useCallback(async () => {
    if (inFlight.current) { rerun.current = true; return; }
    inFlight.current = true;
    setIsLoading(true);
    try {
      // Every page loaded so far, not just page 1: pages are offsets, so arrivals push older rows onto later pages.
      const pages = await Promise.all(Array.from({ length: Math.max(1, pagesLoaded.current) }, (_, i) => fetchPage(i + 1)));
      apply(pages);
      setError(null);
      setStale(false);
      failures.current = 0;
    } catch (e) {
      failures.current += 1;
      setStale(true);
      setError(e instanceof Error ? e.message : 'Could not load notifications');
    } finally {
      setIsLoading(false);
      inFlight.current = false;
      if (rerun.current) { rerun.current = false; void refresh(); }
    }
  }, [fetchPage, apply]);

  const loadMore = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsLoading(true);
    try {
      apply([await fetchPage(pagesLoaded.current + 1)]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load more notifications');
    } finally {
      setIsLoading(false);
      inFlight.current = false;
    }
  }, [fetchPage, apply]);

  const markRead = useCallback(async (id: string) => {
    const res = await latest.current.authFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    const data = await res.json();
    if (!res.ok || !data.success) return;
    const updated: NotificationDTO = data.data;
    setItems((current) => current.map((n) => (n.id === id ? updated : n)));
    if (typeof data.meta?.unreadCount === 'number') setUnreadCount(data.meta.unreadCount);
  }, []);

  const markAllRead = useCallback(async () => {
    const res = await latest.current.authFetch('/api/notifications/read-all', { method: 'POST' });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) return;
    const now = new Date().toISOString();
    setItems((current) => current.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    setUnreadCount(typeof data.data?.unreadCount === 'number' ? data.data.unreadCount : 0);
  }, []);

  // REST first: the inbox loads whether or not the socket ever connects, and reconciles while the app is visible.
  useEffect(() => {
    if (!options.enabled) {
      setItems([]);
      setUnreadCount(0);
      setHasMore(false);
      setStale(false);
      pagesLoaded.current = 0;
      return;
    }
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const delay = Math.min(RECONCILE_MAX_MS, RECONCILE_MS * 2 ** failures.current);
      timer = setTimeout(() => {
        if (document.visibilityState === 'visible') void refresh();
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
      clearTimeout(timer);
    };
  }, [options.enabled, refresh]);

  // The first load, and a new view: its pages start from 1 again. Rows already cached stay and are filtered client side.
  useEffect(() => {
    if (!options.enabled) return;
    pagesLoaded.current = 0;
    void refresh();
  }, [options.enabled, view, refresh]);

  useEffect(() => {
    if (!options.enabled) {
      setStatus('disconnected');
      return;
    }

    let stopped = false;
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/`;

    const connect = (token: string) => {
      if (stopped) return;
      setStatus('connecting');
      const ws = new WebSocket(url);
      socket = ws;
      let authenticated = false;
      ws.onopen = () => ws.send(JSON.stringify({ type: 'AUTH', token }));
      ws.onmessage = (event) => {
        let frame: { type?: string; unreadCount?: number; data?: NotificationDTO };
        try { frame = JSON.parse(event.data); } catch { return; }
        if (frame.type === 'AUTH_OK') {
          authenticated = true;
          attempt = 0;
          setStatus('connected');
          // Anything stored while the socket was down is in the history; the count comes from the same fetch.
          void refresh();
        } else if (frame.type === 'NOTIFICATION' && frame.data) {
          const notification = frame.data;
          // The frame is a hint: merge the row (a duplicate changes nothing) and let the server say what is unread.
          setItems((current) => mergeNotifications(current, [notification]));
          latest.current.onNotification?.(notification);
          void refresh();
        } else if (frame.type === 'INBOX_CHANGED') {
          void refresh();
        }
      };
      ws.onclose = (event) => {
        if (socket === ws) socket = null;
        setStatus('disconnected');
        if (stopped) return;
        // 4401 after a successful handshake means the token reached its expiry (about every 15 minutes): get a
        // fresh one and come straight back. A 4401 before AUTH_OK means the token was rejected outright (for example
        // the service verifies with a different key), so it backs off like any other close: 1 s, 2 s, 4 s ... 30 s.
        const expired = event.code === UNAUTHORIZED && authenticated;
        const delay = expired ? 0 : Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt);
        attempt += 1;
        timer = setTimeout(async () => {
          if (stopped) return;
          const fresh = event.code === UNAUTHORIZED ? await latest.current.refreshToken() : latest.current.token;
          if (fresh) connect(fresh);
          else if (!stopped) timer = setTimeout(() => connect(latest.current.token), MAX_BACKOFF_MS);
        }, delay);
      };
      ws.onerror = () => { /* onclose follows and schedules the retry */ };
    };

    connect(options.token);

    return () => {
      stopped = true;
      clearTimeout(timer);
      socket?.close(1000);
    };
    // Reconnecting on every token change would drop the socket each refresh; the latest token is read from the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.enabled]);

  return { status, unreadCount, total, items, isLoading, error, stale, hasMore, view, setView, refresh, loadMore, markRead, markAllRead };
}

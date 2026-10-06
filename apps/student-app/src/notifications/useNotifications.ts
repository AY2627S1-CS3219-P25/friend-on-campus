/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-06
 * Scope: Client side of the Notification Service's WebSocket and REST contract, per the author's Notification Service
 * Design (third pull request): AUTH frame after login, reconnect with backoff, history over REST, mark read.
 * Review fix the same day: a 4401 before AUTH_OK (token rejected outright, e.g. mismatched keys) backs off like any
 * other close instead of looping refresh -> connect -> 4401 with no pause.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { useCallback, useEffect, useRef, useState } from 'react';
import type { NotificationDTO } from '@campus-errand/common-dtos';

export type SocketStatus = 'connecting' | 'connected' | 'disconnected';

/** The server closes a socket with this code for a missing, bad or expired token. */
const UNAUTHORIZED = 4401;
const MAX_BACKOFF_MS = 30_000;

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

  // Refs so the socket callbacks see the latest token and helpers without reconnecting on every render.
  const latest = useRef(options);
  latest.current = options;

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await latest.current.authFetch('/api/notifications?limit=50');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? `HTTP ${res.status}`);
      setItems(data.data.items);
      setUnreadCount(data.data.unreadCount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load notifications');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    const res = await latest.current.authFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    const data = await res.json();
    if (!res.ok || !data.success) return;
    const updated: NotificationDTO = data.data;
    setItems((current) => current.map((n) => (n.id === id ? updated : n)));
    setUnreadCount((count) => Math.max(0, count - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    const res = await latest.current.authFetch('/api/notifications/read-all', { method: 'POST' });
    if (!res.ok) return;
    const now = new Date().toISOString();
    setItems((current) => current.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!options.enabled) {
      setStatus('disconnected');
      setItems([]);
      setUnreadCount(0);
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
          setUnreadCount(frame.unreadCount ?? 0);
          // The socket carries new rows only; history always comes from REST after a (re)connect.
          void refresh();
        } else if (frame.type === 'NOTIFICATION' && frame.data) {
          const notification = frame.data;
          setItems((current) => (current.some((n) => n.id === notification.id) ? current : [notification, ...current]));
          setUnreadCount((count) => count + 1);
          latest.current.onNotification?.(notification);
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

  return { status, unreadCount, items, isLoading, error, refresh, markRead, markAllRead };
}

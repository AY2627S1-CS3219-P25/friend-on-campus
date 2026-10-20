/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Client side of the Chat Service contract (F8), in the shape of notifications/useNotifications.ts: AUTH
 * frame on /ws/chat/ after login, reconnect with backoff, token refresh on 4401, history over REST per errand,
 * SEND with a client id so a rejection (F8.2.3) is matched to the message that failed. New MESSAGE frames are
 * appended to the errand's list and deduplicated by id.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatErrorCode, ChatHistoryResponse, ChatMessageDTO, ChatServerFrame, ConversationDTO } from '@campus-errand/common-dtos';

export type ChatSocketStatus = 'connecting' | 'connected' | 'disconnected';

export interface ChatThread {
  conversation: ConversationDTO | null;
  messages: ChatMessageDTO[];
  isLoading: boolean;
  /** Why the conversation could not be loaded (404, 403, 503), or null. */
  loadError: string | null;
}

export type SendOutcome = { ok: true } | { ok: false; code: ChatErrorCode | 'DISCONNECTED' | 'TIMEOUT'; message: string };

/** The server closes a socket with this code for a missing, bad or expired token. */
const UNAUTHORIZED = 4401;
const MAX_BACKOFF_MS = 30_000;
const SEND_TIMEOUT_MS = 10_000;

const EMPTY: ChatThread = { conversation: null, messages: [], isLoading: false, loadError: null };

function mergeMessage(list: ChatMessageDTO[], message: ChatMessageDTO): ChatMessageDTO[] {
  if (list.some((m) => m.id === message.id)) return list;
  return [...list, message].sort((a, b) => a.sequence - b.sequence);
}

export function useChat(options: {
  /** Open the socket only while logged in. */
  enabled: boolean;
  /** The current access token; the hook always sends the latest one. */
  token: string;
  refreshToken: () => Promise<string | null>;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
}) {
  const [status, setStatus] = useState<ChatSocketStatus>('disconnected');
  const [threads, setThreads] = useState<Record<string, ChatThread>>({});

  // Refs so the socket callbacks see the latest token and helpers without reconnecting on every render.
  const latest = useRef(options);
  latest.current = options;
  const socketRef = useRef<WebSocket | null>(null);
  const pending = useRef(new Map<string, { resolve: (outcome: SendOutcome) => void; timer: ReturnType<typeof setTimeout> }>());

  const settle = (clientId: string | undefined, outcome: SendOutcome) => {
    if (!clientId) return;
    const entry = pending.current.get(clientId);
    if (!entry) return;
    clearTimeout(entry.timer);
    pending.current.delete(clientId);
    entry.resolve(outcome);
  };

  /** History for one errand: GET /api/chat/:orderId (opens the conversation on the server when needed). */
  const load = useCallback(async (orderId: string) => {
    setThreads((current) => ({ ...current, [orderId]: { ...(current[orderId] ?? EMPTY), isLoading: true, loadError: null } }));
    try {
      const res = await latest.current.authFetch(`/api/chat/${orderId}?limit=100`);
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error ?? `HTTP ${res.status}`);
      const data = body.data as ChatHistoryResponse;
      setThreads((current) => ({
        ...current,
        [orderId]: {
          conversation: data.conversation,
          // Frames that arrived while loading are kept; the history wins on ids it also carries.
          messages: data.messages.reduce(mergeMessage, current[orderId]?.messages ?? []),
          isLoading: false,
          loadError: null,
        },
      }));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Could not load the conversation';
      setThreads((current) => ({ ...current, [orderId]: { ...(current[orderId] ?? EMPTY), isLoading: false, loadError: message } }));
    }
  }, []);

  /** Resolves when the server echoes the message (MESSAGE with this client id) or rejects it (ERROR). */
  const send = useCallback((orderId: string, text: string): Promise<SendOutcome> => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.resolve({ ok: false, code: 'DISCONNECTED', message: 'Not connected; your message was not sent' });
    }
    const clientId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return new Promise<SendOutcome>((resolve) => {
      const timer = setTimeout(() => settle(clientId, { ok: false, code: 'TIMEOUT', message: 'No reply from the server; try again' }), SEND_TIMEOUT_MS);
      pending.current.set(clientId, { resolve, timer });
      ws.send(JSON.stringify({ type: 'SEND', orderId, text, clientId }));
    });
  }, []);

  useEffect(() => {
    if (!options.enabled) {
      setStatus('disconnected');
      setThreads({});
      return;
    }

    let stopped = false;
    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws/chat/`;

    const connect = (token: string) => {
      if (stopped) return;
      setStatus('connecting');
      const ws = new WebSocket(url);
      socket = ws;
      let authenticated = false;
      ws.onopen = () => ws.send(JSON.stringify({ type: 'AUTH', token }));
      ws.onmessage = (event) => {
        let frame: ChatServerFrame & { clientId?: string };
        try { frame = JSON.parse(event.data); } catch { return; }
        if (frame.type === 'AUTH_OK') {
          authenticated = true;
          attempt = 0;
          socketRef.current = ws;
          setStatus('connected');
        } else if (frame.type === 'MESSAGE') {
          const { orderId, message } = frame;
          setThreads((current) => ({ ...current, [orderId]: { ...(current[orderId] ?? EMPTY), messages: mergeMessage(current[orderId]?.messages ?? [], message) } }));
          // The sender's own echo carries no client id, so a pending send is settled by sender and text instead.
          for (const [clientId] of pending.current) settle(clientId, { ok: true });
        } else if (frame.type === 'ERROR') {
          settle(frame.clientId, { ok: false, code: frame.code, message: frame.message });
        }
      };
      ws.onclose = (event) => {
        if (socket === ws) socket = null;
        if (socketRef.current === ws) socketRef.current = null;
        setStatus('disconnected');
        for (const [clientId] of pending.current) settle(clientId, { ok: false, code: 'DISCONNECTED', message: 'Connection lost; your message was not sent' });
        if (stopped) return;
        // 4401 after a successful handshake means the token reached its expiry: get a fresh one and come straight
        // back. A 4401 before AUTH_OK means the token was rejected outright, so it backs off like any other close.
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

  return { status, threads, load, send };
}

export type ChatApi = ReturnType<typeof useChat>;

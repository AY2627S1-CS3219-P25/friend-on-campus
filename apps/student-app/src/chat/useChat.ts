/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: Multi-client UAT finding: a half-open socket kept the indicator on "Connected". The browser's offline event
 * now marks the chat disconnected (which disables Send), the online event drops the socket so the reconnect's AUTH_OK
 * catch-up fills the gap, and open threads are reconciled quietly from their cursor every 30 s and on focus, in the
 * shape of useNotifications' reconcile.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Client side of the Chat Service contract (F8), in the shape of notifications/useNotifications.ts: AUTH
 * frame on /ws/chat/ after login, reconnect with backoff, token refresh on 4401, history over REST per errand,
 * SEND with a client id so a rejection (F8.2.3) is matched to the message that failed. New MESSAGE frames are
 * appended to the errand's list and deduplicated by id.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
 * Scope: Review fixes (PR #148): a pending send is settled only by the echo carrying its clientId; history pages by
 * afterSequence until the last page; after a reconnect every loaded thread catches up from its last sequence.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: Review fix (PR #148, second round): every AUTH_OK, the first included, reconciles the loaded threads from a
 * cursor that is the contiguous coverage of fetched history (loadedThrough), not the highest displayed sequence, so a
 * message that landed between the REST read and the socket authentication is fetched and a gap is never skipped over.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatErrorCode, ChatHistoryResponse, ChatMessageDTO, ChatServerFrame, ConversationDTO } from '@campus-errand/common-dtos';

export type ChatSocketStatus = 'connecting' | 'connected' | 'disconnected';

export interface ChatThread {
  conversation: ConversationDTO | null;
  messages: ChatMessageDTO[];
  /** Every message with a sequence up to this one is present (history fetched, extended by contiguous live frames). */
  loadedThrough: number;
  isLoading: boolean;
  /** Why the conversation could not be loaded (404, 403, 503), or null. */
  loadError: string | null;
}

export type SendOutcome = { ok: true } | { ok: false; code: ChatErrorCode | 'DISCONNECTED' | 'TIMEOUT'; message: string };

/** The server closes a socket with this code for a missing, bad or expired token. */
const UNAUTHORIZED = 4401;
const MAX_BACKOFF_MS = 30_000;
const SEND_TIMEOUT_MS = 10_000;
/** Open threads re-read from their cursor this often while the tab is visible, for drops the browser never reports. */
const RECONCILE_MS = 30_000;
/** The server's maximum page; a page shorter than this is the last one. */
const PAGE_SIZE = 100;

const EMPTY: ChatThread = { conversation: null, messages: [], loadedThrough: 0, isLoading: false, loadError: null };

export function mergeMessage(list: ChatMessageDTO[], message: ChatMessageDTO): ChatMessageDTO[] {
  if (list.some((m) => m.id === message.id)) return list;
  return [...list, message].sort((a, b) => a.sequence - b.sequence);
}

/**
 * Extends `through` (the sequence history is known to be complete up to) over the messages that follow it without a
 * gap. [1, 3] with through 1 stays 1, so the next catch-up fetches from 1 and recovers 2; [1, 2, 3] gives 3.
 */
export function coveredThrough(messages: ChatMessageDTO[], through: number): number {
  for (const message of messages) {
    if (message.sequence === through + 1) through = message.sequence;
    else if (message.sequence > through + 1) break;
  }
  return through;
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

  // The socket callbacks read the threads through this ref so a reconnect can reload what is open without re-binding.
  const threadsRef = useRef(threads);
  threadsRef.current = threads;

  /**
   * History for one errand: GET /api/chat/:orderId (opens the conversation on the server when needed), paged by
   * afterSequence until a page comes back short, so a long conversation is complete (F8.3.1). `afterSequence` lets a
   * catch-up fetch only what was missed; the thread's `loadedThrough` is the cursor for that.
   */
  const load = useCallback(async (orderId: string, afterSequence = 0, quiet = false) => {
    // A quiet catch-up leaves isLoading alone so the panel neither shows "Loading…" nor re-scrolls.
    if (!quiet) setThreads((current) => ({ ...current, [orderId]: { ...(current[orderId] ?? EMPTY), isLoading: true, loadError: null } }));
    try {
      let after = afterSequence;
      let conversation: ConversationDTO | null = null;
      const pages: ChatMessageDTO[] = [];
      for (;;) {
        const res = await latest.current.authFetch(`/api/chat/${orderId}?afterSequence=${after}&limit=${PAGE_SIZE}`);
        const body = await res.json();
        if (!res.ok || !body.success) throw new Error(body.error ?? `HTTP ${res.status}`);
        const data = body.data as ChatHistoryResponse;
        conversation = data.conversation;
        pages.push(...data.messages);
        if (data.messages.length < PAGE_SIZE) break;
        after = data.messages[data.messages.length - 1].sequence;
      }
      setThreads((current) => {
        const thread = current[orderId] ?? EMPTY;
        // Frames that arrived while loading are kept; the history wins on ids it also carries.
        const messages = pages.reduce(mergeMessage, thread.messages);
        // Pages are contiguous from afterSequence, so coverage reaches the last one fetched, then any live frames after it.
        const fetchedThrough = pages.length ? pages[pages.length - 1].sequence : afterSequence;
        return {
          ...current,
          [orderId]: { conversation, messages, loadedThrough: coveredThrough(messages, Math.max(thread.loadedThrough, fetchedThrough)), isLoading: false, loadError: null },
        };
      });
    } catch (e) {
      // A quiet catch-up that fails (the service is restarting, say) leaves the thread as it was; the next one retries.
      if (quiet) return;
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
          // Live frames only reach an authenticated socket, so anything committed after a thread's REST read and
          // before this AUTH_OK (the first one included; a reconnect after token expiry, sleep or a network blip too)
          // is fetched now from the coverage cursor, and the panel need not be collapsed (F8.2.1). A load still in
          // flight is repeated from its cursor as well; mergeMessage makes the overlap harmless.
          for (const [orderId, thread] of Object.entries(threadsRef.current)) {
            if (thread.conversation || thread.isLoading) void load(orderId, thread.loadedThrough);
          }
        } else if (frame.type === 'MESSAGE') {
          const { orderId, message } = frame;
          setThreads((current) => {
            const thread = current[orderId] ?? EMPTY;
            const messages = mergeMessage(thread.messages, message);
            return { ...current, [orderId]: { ...thread, messages, loadedThrough: coveredThrough(messages, thread.loadedThrough) } };
          });
          // Only the sender's own echo carries the client id; a frame from anyone else settles nothing (F8.2.3).
          settle(frame.clientId, { ok: true });
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

    // AI-generated (edited by Reallyeasy1): the browser hears about a lost network before a half-open socket does
    // (the hub's ping evicts only the server side). Offline: say so, which also disables Send. Online: drop the
    // socket so the reconnect's AUTH_OK catch-up fills the gap. For drops the browser never reports, open threads
    // are reconciled quietly from their cursor on a timer and when the tab regains focus (as useNotifications does).
    const onOffline = () => setStatus('disconnected');
    const onOnline = () => socket?.close();
    const reconcile = () => {
      if (document.visibilityState !== 'visible') return;
      for (const [orderId, thread] of Object.entries(threadsRef.current)) {
        if (thread.conversation && !thread.conversation.closedAt && !thread.isLoading) void load(orderId, thread.loadedThrough, true);
      }
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    window.addEventListener('focus', reconcile);
    document.addEventListener('visibilitychange', reconcile);
    const reconcileTimer = setInterval(reconcile, RECONCILE_MS);

    return () => {
      stopped = true;
      clearTimeout(timer);
      clearInterval(reconcileTimer);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('focus', reconcile);
      document.removeEventListener('visibilitychange', reconcile);
      socket?.close(1000);
    };
    // Reconnecting on every token change would drop the socket each refresh; the latest token is read from the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.enabled]);

  return { status, threads, load, send };
}

export type ChatApi = ReturnType<typeof useChat>;

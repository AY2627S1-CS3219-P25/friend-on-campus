/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-27
 * Scope: Issue #202 (simulated UAT case H03): a send whose echo never arrives (timeout, or the socket closed while it
 * was pending) is no longer reported as "not sent". The hook keeps what it sent (order, text, time) and reconciles
 * against the server's history: after the timeout it re-reads the thread from its cursor, and after a reconnect's
 * AUTH_OK catch-up it checks again; a copy of the text from this user at or after the send settles the send as
 * delivered (composer clears), otherwise the outcome is UNCONFIRMED with copy that asks the user to check the
 * conversation before sending again. The clientId stays correlation only; nothing deduplicates server side.
 * Author review: <to be completed by Reallyeasy1>
 *
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

export type SendOutcome = { ok: true } | { ok: false; code: ChatErrorCode | 'DISCONNECTED' | 'UNCONFIRMED'; message: string };

/** What the user saw when the server neither echoed nor rejected a send and history does not show it either. */
export const UNCONFIRMED_MESSAGE = 'We could not confirm this message was delivered. It may still arrive; check the conversation before sending it again.';

/**
 * The server's copy of a send whose echo was lost: a message from this user with the same text, stored at or after
 * the moment the send started (a second's slack for clock skew). Used to settle an unconfirmed send from history.
 */
export function findDeliveredCopy(messages: ChatMessageDTO[], sent: { senderId: string; text: string; startedAt: number }): ChatMessageDTO | undefined {
  return messages.find((m) => m.senderId === sent.senderId && m.text === sent.text && new Date(m.sentAt).getTime() >= sent.startedAt - 1000);
}

/** The user id claimed by the access token; the server authenticates every frame, this only labels the local echo. */
function tokenUserId(token: string): string {
  try {
    const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof claims.sub === 'string' ? claims.sub : '';
  } catch { return ''; }
}

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
  // AI-generated (edited by Reallyeasy1): a pending send remembers what it sent so it can be reconciled from history.
  const pending = useRef(new Map<string, { orderId: string; text: string; startedAt: number; resolve: (outcome: SendOutcome) => void; timer: ReturnType<typeof setTimeout> }>());

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
  // AI-generated (edited by Reallyeasy1): written inside every state update, so code that awaits load() can read the
  // merged thread before React has rendered it (threadsRef lags until the next render).
  const latestThreads = useRef(threads);
  const updateThreads = useCallback((updater: (current: Record<string, ChatThread>) => Record<string, ChatThread>) => {
    setThreads((current) => { const next = updater(current); latestThreads.current = next; return next; });
  }, []);

  // AI-generated (edited by Reallyeasy1): the threads whose panel is on screen; only those are reconciled on the
  // timer, so a session that opened many errands does not re-read them all every 30 s. ChatPanel registers itself.
  const watched = useRef(new Set<string>());
  const watch = useCallback((orderId: string) => {
    watched.current.add(orderId);
    return () => { watched.current.delete(orderId); };
  }, []);

  /**
   * History for one errand: GET /api/chat/:orderId (opens the conversation on the server when needed), paged by
   * afterSequence until a page comes back short, so a long conversation is complete (F8.3.1). `afterSequence` lets a
   * catch-up fetch only what was missed; the thread's `loadedThrough` is the cursor for that.
   */
  // AI-generated (edited by Reallyeasy1): a quiet catch-up (reconcile timer, focus) leaves isLoading alone so the
  // panel neither shows "Loading…" nor re-scrolls, never surfaces an error, and never runs twice at once for a thread
  // (focus and visibilitychange both fire on a tab return).
  const inFlight = useRef(new Set<string>());
  const load = useCallback(async (orderId: string, afterSequence = 0, quiet = false) => {
    if (quiet && inFlight.current.has(orderId)) return;
    inFlight.current.add(orderId);
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
      updateThreads((current) => {
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
      // AI-generated (edited by Reallyeasy1): a quiet catch-up that fails (the service is restarting, say) leaves the
      // thread as it was; the next one retries.
      if (quiet) return;
      const message = e instanceof Error ? e.message : 'Could not load the conversation';
      setThreads((current) => ({ ...current, [orderId]: { ...(current[orderId] ?? EMPTY), isLoading: false, loadError: message } }));
    } finally {
      inFlight.current.delete(orderId);
    }
  }, [updateThreads]);

  /**
   * A send the server neither echoed nor rejected: re-read the thread from its cursor and settle from what is stored.
   * The same check runs after a reconnect's catch-up, so a socket that closed with the send pending is reconciled
   * as soon as history is readable again (issue #202).
   */
  // AI-generated (edited by Reallyeasy1)
  const reconcilePending = useCallback(async (clientIds: string[], reload: boolean) => {
    const me = tokenUserId(latest.current.token);
    for (const clientId of clientIds) {
      const entry = pending.current.get(clientId);
      if (!entry) continue;
      if (reload) await load(entry.orderId, latestThreads.current[entry.orderId]?.loadedThrough ?? 0, true);
      const stillPending = pending.current.get(clientId);
      if (!stillPending) continue; // the echo arrived meanwhile
      const copy = findDeliveredCopy(latestThreads.current[entry.orderId]?.messages ?? [], { senderId: me, text: entry.text, startedAt: entry.startedAt });
      settle(clientId, copy ? { ok: true } : { ok: false, code: 'UNCONFIRMED', message: UNCONFIRMED_MESSAGE });
    }
  }, [load]);

  /**
   * Resolves when the server echoes the message (MESSAGE with this client id) or rejects it (ERROR); without either
   * the outcome comes from history (delivered, or UNCONFIRMED), never from a guess that it was not sent.
   */
  const send = useCallback((orderId: string, text: string): Promise<SendOutcome> => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.resolve({ ok: false, code: 'DISCONNECTED', message: 'Not connected; your message was not sent' });
    }
    const clientId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return new Promise<SendOutcome>((resolve) => {
      const timer = setTimeout(() => { void reconcilePending([clientId], true); }, SEND_TIMEOUT_MS);
      pending.current.set(clientId, { orderId, text, startedAt: Date.now(), resolve, timer });
      ws.send(JSON.stringify({ type: 'SEND', orderId, text, clientId }));
    });
  }, [reconcilePending]);

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
          const catchUp = Object.entries(threadsRef.current)
            .filter(([, thread]) => thread.conversation || thread.isLoading)
            .map(([orderId, thread]) => load(orderId, thread.loadedThrough));
          // Sends left pending by the drop are judged from the caught-up history, not declared lost (issue #202).
          if (pending.current.size) void Promise.all(catchUp).then(() => reconcilePending([...pending.current.keys()], false));
        } else if (frame.type === 'MESSAGE') {
          const { orderId, message } = frame;
          updateThreads((current) => {
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
        // Pending sends stay pending: the server may have committed them. Each one's timer re-reads history over
        // REST, and a reconnect's catch-up checks them earlier (issue #202).
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
    // (the hub's ping evicts only the server side). Offline: close the socket, which settles pending sends with
    // "Connection lost" and disables Send. Online: forget the backoff and reconnect at once (closing a socket that is
    // still there, else connecting), so the AUTH_OK catch-up fills the gap within a second. For drops the browser
    // never reports, the threads with a panel on screen are reconciled quietly from their cursor on a timer and when
    // the tab regains focus (as useNotifications does).
    const onOffline = () => { if (socket) socket.close(); else setStatus('disconnected'); };
    const onOnline = () => {
      clearTimeout(timer);
      attempt = 0;
      if (socket) socket.close(); else connect(latest.current.token);
    };
    const reconcile = () => {
      if (document.visibilityState !== 'visible') return;
      for (const orderId of watched.current) {
        const thread = threadsRef.current[orderId];
        if (thread?.conversation && !thread.conversation.closedAt) void load(orderId, thread.loadedThrough, true);
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

  return { status, threads, load, send, watch };
}

export type ChatApi = ReturnType<typeof useChat>;

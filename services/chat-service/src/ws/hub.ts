/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: The chat socket hub, copied from notification-service/src/ws/hub.ts (the author's Notification Service
 * socket design: AUTH first within a time limit, sockets filed by user, close at token expiry, ping eviction) and
 * extended for the frames the author's S5 answers reuse from it: SEND from the client, MESSAGE and ERROR back. The
 * send rules themselves live in conversations/service.ts; the hub only carries frames and fans MESSAGE out by user id.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
 * Scope: Review fix (PR #148): the sender's own MESSAGE echo carries the SEND's clientId; other recipients get the
 * frame without it.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { WebSocket } from 'ws';
import { readPublicKey, verifyAccessToken, type AuthMiddlewareOptions, type AuthenticatedPrincipal } from '@campus-errand/auth';
import type { ChatErrorCode, ChatMessageDTO, ChatServerFrame, UserRole } from '@campus-errand/common-dtos';
import type { SendResult } from '../conversations/service';
import type { MessageRow } from '../conversations/store';

/** Close code for a missing or bad AUTH frame and for a token that has expired. */
export const UNAUTHORIZED = 4401;
const MAX_TIMER_MS = 2 ** 31 - 1;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SocketIdentity {
  principal: AuthenticatedPrincipal;
  /** Epoch milliseconds at which the access token stops being valid. */
  expiresAt: number;
}

/** Same checks as the HTTP middleware (key, issuer, audience, expiry). Throws for any token that fails them. */
export function createSocketAuthenticator(options: AuthMiddlewareOptions) {
  const publicKey = readPublicKey(options.publicKey);
  return (token: string): SocketIdentity => {
    const principal = verifyAccessToken(token, publicKey, options);
    // The signature was checked above, so the claims can be read directly.
    const { exp } = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { exp: number };
    return { principal, expiresAt: exp * 1000 };
  };
}

export function toMessageDTO(row: MessageRow): ChatMessageDTO {
  return { ...row, senderRole: row.senderRole as UserRole };
}

const ERROR_TEXT: Record<ChatErrorCode, string> = {
  NOT_FOUND: 'No conversation exists for this errand',
  FORBIDDEN: 'Only the requester and the assigned courier may send messages',
  CLOSED: 'This errand is finished; the conversation is read-only',
  EMPTY: 'A message cannot be empty',
  NO_USERNAME: 'Your session has no username; log in again to send messages',
  BAD_FRAME: 'Unrecognised frame',
};

export function createChatHub(options: {
  authenticate: (token: string) => SocketIdentity;
  send: (orderId: string, principal: AuthenticatedPrincipal, text: string) => Promise<SendResult>;
  authTimeoutMs?: number;
  pingIntervalMs?: number;
}) {
  const byUser = new Map<string, Set<WebSocket>>();
  const all = new Set<WebSocket>();
  const answeredPing = new WeakSet<WebSocket>();

  // A socket that did not answer the previous ping is gone; terminating it fires its close handler.
  const pinger = setInterval(() => {
    for (const ws of all) {
      if (!answeredPing.has(ws)) { ws.terminate(); continue; }
      answeredPing.delete(ws);
      ws.ping();
    }
  }, options.pingIntervalMs ?? 30_000);
  pinger.unref();

  function sendFrame(ws: WebSocket, frame: ChatServerFrame) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(frame));
  }

  /** Sends to every open socket of this user and returns how many there were. */
  function push(userId: string, frame: ChatServerFrame): number {
    let sent = 0;
    for (const ws of byUser.get(userId) ?? []) {
      if (ws.readyState === WebSocket.OPEN) { ws.send(JSON.stringify(frame)); sent += 1; }
    }
    return sent;
  }

  async function handleSend(ws: WebSocket, principal: AuthenticatedPrincipal, frame: Record<string, unknown>) {
    const clientId = typeof frame.clientId === 'string' ? frame.clientId : undefined;
    const orderId = typeof frame.orderId === 'string' && UUID.test(frame.orderId) ? frame.orderId.toLowerCase() : undefined;
    if (!orderId || typeof frame.text !== 'string') {
      sendFrame(ws, { type: 'ERROR', clientId, code: 'BAD_FRAME', message: ERROR_TEXT.BAD_FRAME });
      return;
    }
    const result = await options.send(orderId, principal, frame.text);
    if (result.kind !== 'sent') {
      const code = result.kind.toUpperCase() as ChatErrorCode;
      sendFrame(ws, { type: 'ERROR', orderId, clientId, code, message: ERROR_TEXT[code] });
      return;
    }
    const message = toMessageDTO(result.message);
    // The sender's own sockets (every tab) get the echo with the client id, so the client settles exactly the send it
    // belongs to; the other participant's sockets get the plain frame.
    push(principal.userId, { type: 'MESSAGE', orderId, clientId, message });
    for (const userId of new Set(result.recipientIds)) {
      if (userId !== principal.userId) push(userId, { type: 'MESSAGE', orderId, message });
    }
  }

  function handleConnection(ws: WebSocket) {
    let principal: AuthenticatedPrincipal | undefined;
    let expiryTimer: NodeJS.Timeout | undefined;
    const reject = () => ws.close(UNAUTHORIZED);
    const authTimer = setTimeout(reject, options.authTimeoutMs ?? 5000);

    all.add(ws);
    answeredPing.add(ws);
    ws.on('pong', () => answeredPing.add(ws));
    ws.on('error', () => ws.terminate());
    ws.on('close', () => {
      clearTimeout(authTimer);
      clearTimeout(expiryTimer);
      all.delete(ws);
      const mine = principal ? byUser.get(principal.userId) : undefined;
      mine?.delete(ws);
      if (principal && mine?.size === 0) byUser.delete(principal.userId);
    });

    ws.on('message', (data) => {
      let frame: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(data.toString());
        if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
        frame = parsed as Record<string, unknown>;
      } catch {
        if (!principal) reject();
        else sendFrame(ws, { type: 'ERROR', code: 'BAD_FRAME', message: ERROR_TEXT.BAD_FRAME });
        return;
      }

      // The first frame must be AUTH (same handshake as the Notification Service).
      if (!principal) {
        clearTimeout(authTimer);
        let identity: SocketIdentity;
        try {
          if (frame.type !== 'AUTH' || typeof frame.token !== 'string') throw new Error('not an AUTH frame');
          identity = options.authenticate(frame.token);
        } catch {
          reject();
          return;
        }
        // The socket closes when the token it was opened with expires; the client reconnects with a fresh one.
        expiryTimer = setTimeout(reject, Math.min(Math.max(identity.expiresAt - Date.now(), 0), MAX_TIMER_MS));
        principal = identity.principal;
        if (!byUser.has(principal.userId)) byUser.set(principal.userId, new Set());
        byUser.get(principal.userId)!.add(ws);
        sendFrame(ws, { type: 'AUTH_OK' });
        return;
      }

      if (frame.type === 'SEND') {
        void handleSend(ws, principal, frame).catch(() => ws.close(1011));
        return;
      }
      sendFrame(ws, { type: 'ERROR', code: 'BAD_FRAME', message: ERROR_TEXT.BAD_FRAME });
    });
  }

  return {
    handleConnection,
    push,
    /** Authenticated sockets of one user, or every connected socket when no user is given. */
    connectionCount(userId?: string): number {
      return userId ? byUser.get(userId)?.size ?? 0 : all.size;
    },
    close() {
      clearInterval(pinger);
      for (const ws of all) ws.close(1001);
    },
  };
}

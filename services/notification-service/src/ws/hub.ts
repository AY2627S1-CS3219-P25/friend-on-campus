/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: The WebSocket hub of the author's design: AUTH as the first frame within a time limit, sockets filed under
 * the token's user, push to one user's sockets, close at token expiry, and a ping that evicts dead sockets.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { WebSocket } from 'ws';
import { readPublicKey, verifyAccessToken, type AuthMiddlewareOptions } from '@campus-errand/auth';
import type { NotificationDTO } from '@campus-errand/common-dtos';

/** Close code for a missing or bad AUTH frame and for a token that has expired. */
export const UNAUTHORIZED = 4401;
const MAX_TIMER_MS = 2 ** 31 - 1;

export interface SocketIdentity {
  userId: string;
  /** Epoch milliseconds at which the access token stops being valid. */
  expiresAt: number;
}

/** Same checks as the HTTP middleware (key, issuer, audience, expiry). Throws for any token that fails them. */
export function createSocketAuthenticator(options: AuthMiddlewareOptions) {
  const publicKey = readPublicKey(options.publicKey);
  return (token: string): SocketIdentity => {
    const { userId } = verifyAccessToken(token, publicKey, options);
    // The signature was checked above, so the claims can be read directly.
    const { exp } = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')) as { exp: number };
    return { userId, expiresAt: exp * 1000 };
  };
}

export function createHub(options: {
  authenticate: (token: string) => SocketIdentity;
  unreadCount: (userId: string) => Promise<number>;
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

  function handleConnection(ws: WebSocket) {
    let userId: string | undefined;
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
      const mine = userId ? byUser.get(userId) : undefined;
      mine?.delete(ws);
      if (userId && mine?.size === 0) byUser.delete(userId);
    });

    // Only the first frame is read. Later frames are ignored: clients have nothing else to say on this socket.
    ws.once('message', (data) => {
      clearTimeout(authTimer);
      let identity: SocketIdentity;
      try {
        const frame = JSON.parse(data.toString());
        if (frame?.type !== 'AUTH' || typeof frame.token !== 'string') throw new Error('not an AUTH frame');
        identity = options.authenticate(frame.token);
      } catch {
        reject();
        return;
      }
      // The socket closes when the token it was opened with expires; the client reconnects with a fresh one.
      expiryTimer = setTimeout(reject, Math.min(Math.max(identity.expiresAt - Date.now(), 0), MAX_TIMER_MS));
      options.unreadCount(identity.userId).then(
        (unreadCount) => {
          if (ws.readyState !== WebSocket.OPEN) return;
          ws.send(JSON.stringify({ type: 'AUTH_OK', unreadCount }));
          // Filed after AUTH_OK so that frame is always first. A notification stored in between is in the
          // history the client fetches over REST once it has AUTH_OK.
          userId = identity.userId;
          if (!byUser.has(userId)) byUser.set(userId, new Set());
          byUser.get(userId)!.add(ws);
        },
        () => ws.close(1011),
      );
    });
  }

  return {
    handleConnection,
    /** Sends to every open socket of this user and returns how many there were. */
    push(userId: string, notification: NotificationDTO): number {
      const frame = JSON.stringify({ type: 'NOTIFICATION', data: notification });
      let sent = 0;
      for (const ws of byUser.get(userId) ?? []) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(frame);
          sent += 1;
        }
      }
      return sent;
    },
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

/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-10-19
 * Scope: Connect the existing submission API to authenticated posting, resumable polling and saga outcomes.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import type { CreateOrderRequest, OrderSubmissionDTO } from '@campus-errand/common-dtos';
import { useEffect, useRef, useState } from 'react';

type State = { owner: string | null; receipt: OrderSubmissionDTO | null; posting: boolean; error: string | null; unconfirmed?: boolean };
const pending = (receipt: OrderSubmissionDTO | null) => receipt?.status === 'PENDING' || receipt?.status === 'COMPENSATING';
const storageKey = (userId: string) => `order-submission:${userId}`;

// Used only to scope local UI state. The server authenticates every request.
export function tokenUserId(token: string): string | null {
  try {
    const claims = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof claims.sub === 'string' ? claims.sub : null;
  } catch { return null; }
}

export function useOrderSubmission(options: {
  userId: string | null;
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onSettled: (receipt: OrderSubmissionDTO) => void;
}) {
  const latest = useRef(options);
  latest.current = options;
  const [state, setState] = useState<State>({ owner: null, receipt: null, posting: false, error: null });
  const generation = useRef(0);
  const posting = useRef(false);
  const { userId } = options;

  useEffect(() => {
    const epoch = ++generation.current;
    posting.current = false;
    let receipt: OrderSubmissionDTO | null = null;
    if (userId) {
      try {
        const id = sessionStorage.getItem(storageKey(userId));
        if (id && /^[0-9a-f-]{36}$/i.test(id)) receipt = { id, status: 'PENDING' };
      } catch { /* Polling still works when browser storage is unavailable. */ }
    }
    setState({ owner: userId, receipt, posting: false, error: null });
    return () => { generation.current = epoch + 1; };
  }, [userId]);

  const submissionId = state.owner === userId ? state.receipt?.id : undefined;
  useEffect(() => {
    if (!userId || !submissionId || !pending(state.receipt)) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    const poll = async () => {
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10000);
      try {
        const res = await latest.current.authFetch(`/api/orders/submissions/${submissionId}`, { signal: controller.signal });
        const body = await res.json();
        if (stopped || latest.current.userId !== userId) return;
        if (res.status === 403 || res.status === 404) {
          try { sessionStorage.removeItem(storageKey(userId)); } catch { /* Optional browser persistence. */ }
          setState({ owner: userId, receipt: null, posting: false, error: 'This submission is no longer available. Check your Tasks before submitting again.' });
          return;
        }
        if (!res.ok || !body.success || !body.data) throw new Error('Status unavailable');
        const receipt = body.data as OrderSubmissionDTO;
        if (receipt.id !== submissionId || !['PENDING', 'OPEN', 'REJECTED', 'COMPENSATING', 'COMPENSATED'].includes(receipt.status) || (receipt.status === 'OPEN' && !receipt.order)) {
          throw new Error('Invalid submission result');
        }
        setState({ owner: userId, receipt, posting: false, error: null });
        if (!pending(receipt)) {
          try { sessionStorage.removeItem(storageKey(userId)); } catch { /* Optional browser persistence. */ }
          latest.current.onSettled(receipt);
          return;
        }
      } catch {
        if (stopped || latest.current.userId !== userId) return;
        setState(current => ({ ...current, error: 'Unable to check your submission right now. We will keep checking; please do not submit it again.' }));
      } finally { clearTimeout(timeout); }
      if (!stopped) timer = setTimeout(poll, 1000);
    };
    void poll();
    return () => { stopped = true; clearTimeout(timer); controller?.abort(); };
    // Poll one submission until terminal; status updates must not restart its request loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, submissionId]);

  async function submit(request: CreateOrderRequest) {
    if (!userId || state.owner !== userId || posting.current || pending(state.receipt)) return;
    const epoch = generation.current;
    posting.current = true;
    setState({ owner: userId, receipt: null, posting: true, error: null });
    try {
      const res = await latest.current.authFetch('/api/orders', {
        method: 'POST', body: JSON.stringify(request), signal: AbortSignal.timeout(15000),
      });
      const body = await res.json();
      if (epoch !== generation.current || latest.current.userId !== userId) return;
      if (!res.ok) {
        setState({ owner: userId, receipt: null, posting: false, error: body.error || 'Unable to submit this errand.' });
        return;
      }
      const receipt = body.data as OrderSubmissionDTO;
      if (res.status !== 202 || receipt?.status !== 'PENDING' || !/^[0-9a-f-]{36}$/i.test(receipt.id)) throw new Error('Missing receipt');
      try { sessionStorage.setItem(storageKey(userId), receipt.id); } catch { /* Optional browser persistence. */ }
      setState({ owner: userId, receipt, posting: false, error: null });
    } catch {
      if (epoch === generation.current && latest.current.userId === userId) {
        // A lost response does not prove failure, and without its ID we cannot poll the submission.
        setState({ owner: userId, receipt: null, posting: false, error: null, unconfirmed: true });
      }
    } finally {
      if (epoch === generation.current) posting.current = false;
    }
  }

  const current = state.owner === userId ? state : { owner: userId, receipt: null, posting: false, error: null };
  return { ...current, busy: state.owner !== userId || current.posting || pending(current.receipt), submit };
}

/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Light elegant theme update for outgoing chat bubble styling.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: PR #196 review: the panel registers its thread with the chat hook while mounted, so only on-screen threads
 * are reconciled on the hook's timer.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: Restyled to the author's errand-page wireframe (issue #188): "Live errand chat" header with the connection
 * state in words, own messages in NUS blue on the right, a pill composer with a round orange send button, a taller
 * list that fills the card's height on desktop and scrolls inside it; opens at the newest message and follows new
 * ones only while the reader is at the bottom. PR #192 review: the service's 404 (never accepted) is an empty state.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: The conversation panel that expands inside a Tasks card (author's D9 and S2): messages as plain text with
 * the sender's username and time (F8.2.2), long messages clamped with a Show more toggle (S2 answer 1), a composer
 * that rejects blank text locally and shows the server's reason when a send fails (F8.2.3), and a read-only state
 * once the errand is finished (F8.3.2). Styling follows the Tasks card and ExpandableNotes.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
 * Scope: Review fix (PR #148): the panel takes the errand's status and reloads the conversation when it changes, so
 * the read-only switch happens while the panel is open.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, RefreshCw, Send } from 'lucide-react';
import type { ChatMessageDTO, OrderStatus } from '@campus-errand/common-dtos';
import type { ChatApi, ChatSocketStatus } from './useChat';

function MessageText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const preview = useRef<HTMLParagraphElement>(null);
  const id = React.useId();

  useEffect(() => {
    if (expanded || !preview.current) return;
    const element = preview.current;
    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <>
      <p id={id} ref={preview} className={`whitespace-pre-wrap break-words text-sm leading-5 ${expanded ? '' : 'line-clamp-3'}`}>
        {text}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((value) => !value)}
          className="text-xs font-semibold text-blue-700 hover:underline"
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </>
  );
}

function Bubble({ message, mine }: { message: ChatMessageDTO; mine: boolean }) {
  const time = new Date(message.sentAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
  return (
    <li className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] px-3.5 py-2 shadow-2xs ${mine ? 'bg-blue-600 text-white rounded-2xl rounded-br-md' : 'bg-slate-100 text-slate-800 rounded-2xl rounded-bl-md'}`}>
        <p className={`text-[11px] mb-0.5 ${mine ? 'text-blue-100' : 'text-slate-500'}`}>
          <span className={`font-semibold ${mine ? 'text-white' : 'text-slate-700'}`}>{mine ? 'You' : message.senderUsername}</span>
          {' · '}
          <time dateTime={message.sentAt}>{time}</time>
        </p>
        <MessageText text={message.text} />
      </div>
    </li>
  );
}

export function ChatPanel({ orderId, status, currentUserId, chat }: {
  orderId: string;
  /** The errand's current status from the orders poll; a change reloads the conversation so closedAt is live (F8.3.2). */
  status: OrderStatus;
  currentUserId: string | null;
  chat: ChatApi;
}) {
  const thread = chat.threads[orderId];
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const load = chat.load;

  // The server pushes no frame when a conversation closes; the card's status is the signal that it may have.
  useEffect(() => { void load(orderId); }, [load, orderId, status]);
  // AI-generated (edited by Reallyeasy1): while this panel is on screen its thread is reconciled on the hook's timer.
  const watch = chat.watch;
  useEffect(() => watch(orderId), [watch, orderId]);
  // Chat-app scrolling: open at the newest message, follow new ones only while the reader is already at the bottom
  // (a reader who scrolled up to re-read is not yanked down); the reader's own send always lands at the bottom.
  const stickToBottom = useRef(true);
  const onListScroll = () => {
    const el = list.current;
    if (el) stickToBottom.current = el.scrollHeight - el.clientHeight - el.scrollTop < 24;
  };
  const lastId = thread?.messages.at(-1)?.id;
  const lastMine = thread?.messages.at(-1)?.senderId === currentUserId;
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    if (stickToBottom.current || lastMine) el.scrollTo({ top: el.scrollHeight });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastId, thread?.isLoading]);

  const closed = Boolean(thread?.conversation?.closedAt);
  // The Chat Service answers 404 for an errand nobody ever accepted; that is an empty state, not a failure.
  const noConversation = Boolean(thread?.loadError && /no conversation exists/i.test(thread.loadError));
  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.trim().length === 0) { setSendError('A message cannot be empty'); return; }
    setIsSending(true);
    setSendError(null);
    const outcome = await chat.send(orderId, draft);
    setIsSending(false);
    if (outcome.ok) setDraft('');
    else setSendError(outcome.message);
  };

  return (
    <section aria-label="Live errand chat" className="flex flex-col gap-3 lg:flex-1 lg:min-h-0" data-testid="chat-panel">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><MessageCircle className="h-4 w-4 text-nus-blue" /> Live errand chat</h3>
        <SocketDot status={chat.status} />
      </div>

      {thread?.loadError && !noConversation && (
        <p className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs px-2 py-1.5">
          {thread.loadError}{' '}
          <button type="button" onClick={() => void load(orderId)} className="font-bold underline">Retry</button>
        </p>
      )}

      <ul ref={list} onScroll={onListScroll} className="max-h-80 min-h-[8rem] overflow-y-auto overscroll-contain space-y-2 pr-1 lg:flex-1 lg:min-h-0 lg:max-h-none" aria-live="polite">
        {thread?.isLoading && !thread.messages.length && (
          <li className="text-xs text-slate-400 flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> Loading…</li>
        )}
        {noConversation && (
          <li className="text-xs text-slate-400">No conversation for this errand: no courier accepted it.</li>
        )}
        {thread && !thread.isLoading && !thread.loadError && thread.messages.length === 0 && (
          <li className="text-xs text-slate-400">No messages yet. Say where you are or when you’ll arrive.</li>
        )}
        {thread?.messages.map((message) => (
          <Bubble key={message.id} message={message} mine={message.senderId === currentUserId} />
        ))}
      </ul>

      {noConversation ? null : closed ? (
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">This errand is finished; the conversation is read-only.</p>
      ) : (
        <form onSubmit={handleSend} className="space-y-1">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(event) => { setDraft(event.target.value); if (sendError) setSendError(null); }}
              onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void handleSend(event); } }}
              rows={1}
              placeholder="Write a message"
              aria-label="Message"
              disabled={isSending || !thread?.conversation}
              className="flex-1 resize-none rounded-full border border-slate-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSending || !thread?.conversation || chat.status !== 'connected'}
              aria-label="Send"
              className="h-10 w-10 shrink-0 rounded-full bg-nus-orange hover:bg-orange-600 text-white flex items-center justify-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          {sendError && <p role="alert" className="text-xs text-rose-700">{sendError}</p>}
          {chat.status !== 'connected' && !sendError && (
            <p className="text-xs text-slate-400">Reconnecting… messages can be sent once connected.</p>
          )}
        </form>
      )}
    </section>
  );
}

function SocketDot({ status }: { status: ChatSocketStatus }) {
  const colour = status === 'connected' ? 'bg-emerald-500' : status === 'connecting' ? 'bg-amber-400' : 'bg-slate-300';
  const word = status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting' : 'Offline';
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500" title={`Chat ${status}`}>
      <span className={`inline-block h-2 w-2 rounded-full ${colour}`} aria-hidden="true" />
      {word}
    </span>
  );
}

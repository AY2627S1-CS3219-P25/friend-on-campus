/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: The conversation panel that expands inside a Tasks card (author's D9 and S2): messages as plain text with
 * the sender's username and time (F8.2.2), long messages clamped with a Show more toggle (S2 answer 1), a composer
 * that rejects blank text locally and shows the server's reason when a send fails (F8.2.3), and a read-only state
 * once the errand is finished (F8.3.2). Styling follows the Tasks card and ExpandableNotes.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, RefreshCw, Send } from 'lucide-react';
import type { ChatMessageDTO } from '@campus-errand/common-dtos';
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
      <div className={`max-w-[85%] rounded-xl px-3 py-2 ${mine ? 'bg-blue-50 text-slate-900' : 'bg-slate-100 text-slate-800'}`}>
        <p className="text-xs text-slate-500 mb-0.5">
          <span className="font-semibold text-slate-700">{mine ? 'You' : message.senderUsername}</span>
          {' · '}
          <time dateTime={message.sentAt}>{time}</time>
        </p>
        <MessageText text={message.text} />
      </div>
    </li>
  );
}

export function ChatPanel({ orderId, currentUserId, chat }: { orderId: string; currentUserId: string | null; chat: ChatApi }) {
  const thread = chat.threads[orderId];
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const list = useRef<HTMLUListElement>(null);
  const load = chat.load;

  useEffect(() => { void load(orderId); }, [load, orderId]);
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [thread?.messages.length]);

  const closed = Boolean(thread?.conversation?.closedAt);
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
    <section aria-label="Conversation" className="mt-2 border-t border-slate-100 pt-2 space-y-2" data-testid="chat-panel">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> Conversation</span>
        <SocketDot status={chat.status} />
      </div>

      {thread?.loadError && (
        <p className="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs px-2 py-1.5">
          {thread.loadError}{' '}
          <button type="button" onClick={() => void load(orderId)} className="font-bold underline">Retry</button>
        </p>
      )}

      <ul ref={list} className="max-h-64 overflow-y-auto space-y-1.5 pr-1" aria-live="polite">
        {thread?.isLoading && !thread.messages.length && (
          <li className="text-xs text-slate-400 flex items-center gap-1"><RefreshCw className="h-3 w-3 animate-spin" /> Loading…</li>
        )}
        {thread && !thread.isLoading && !thread.loadError && thread.messages.length === 0 && (
          <li className="text-xs text-slate-400">No messages yet.</li>
        )}
        {thread?.messages.map((message) => (
          <Bubble key={message.id} message={message} mine={message.senderId === currentUserId} />
        ))}
      </ul>

      {closed ? (
        <p className="text-xs text-slate-500 italic">This errand is finished; the conversation is read-only.</p>
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
              className="flex-1 resize-none rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSending || !thread?.conversation || chat.status !== 'connected'}
              aria-label="Send"
              className="bg-nus-orange hover:bg-orange-600 text-white rounded-lg px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
  return (
    <span className="flex items-center gap-1" title={`Chat ${status}`}>
      <span className={`inline-block h-2 w-2 rounded-full ${colour}`} aria-hidden="true" />
      <span className="sr-only">Chat {status}</span>
    </span>
  );
}

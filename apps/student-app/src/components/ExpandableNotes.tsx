/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6); Google Antigravity Agent; Claude Code (model: Claude Fable 5.1), date: 2026-10-20 to 2026-11-07
 * Scope: Extracted ExpandableNotes component from student-app App.tsx into components/ExpandableNotes.tsx; updated across 3 AI-assisted revisions through D4 wrap-up (refine the approved campus UI with quieter surfaces, readable hierarchy, and accessible interactions).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */


import React, { useEffect, useRef, useState } from 'react';

export function ExpandableNotes({ notes }: { notes?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const preview = useRef<HTMLParagraphElement>(null);
  const notesId = React.useId();

  useEffect(() => {
    if (expanded || !preview.current) return;
    const element = preview.current;
    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [notes, expanded]);

  return (
    <div className="mt-1 text-sm text-slate-600" data-testid="special-notes">
      <p
        id={notesId}
        ref={preview}
        className={`whitespace-pre-wrap break-words leading-5 ${
          expanded ? 'max-h-40 overflow-y-auto' : 'line-clamp-2'
        }`}
      >
        {notes || 'No special notes.'}
      </p>
      <div>
        {(overflows || expanded) && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={notesId}
            onClick={() => setExpanded((value) => !value)}
            className="relative z-10 text-sm font-semibold text-blue-700 hover:underline"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  );
}

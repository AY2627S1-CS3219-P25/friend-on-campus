/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-20
 * Scope: Extracted ExpandableNotes component from student-app App.tsx into components/ExpandableNotes.tsx.
 * Author review: Verified by yanhwee
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: Errand details page (issue #189): the Show more button is raised above a card's stretched details link so it
 * expands the notes instead of opening the page.
 * Author review: <to be completed by Reallyeasy1>
 */

// AI-generated (edited by huangjiaxi1111)
// AI-generated (edited by yanhwee)

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
    <div className="mt-1 text-sm text-slate-500" data-testid="special-notes">
      <p
        id={notesId}
        ref={preview}
        className={`whitespace-pre-wrap break-words leading-5 ${
          expanded ? 'max-h-40 overflow-y-auto' : 'line-clamp-2 h-10'
        }`}
      >
        {notes || 'No special notes.'}
      </p>
      <div className="h-11">
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

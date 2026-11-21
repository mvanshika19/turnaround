import { MapPinned } from 'lucide-react';

import { cn } from '@/lib/cn';

import type { ConversationEntry } from '../hooks/useCopilot';

/** One message. Text is rendered as plain text with its line breaks; nothing is parsed as HTML. */
export function MessageBubble({ entry }: { entry: ConversationEntry }) {
  const fromUser = entry.role === 'user';

  return (
    <li className={cn('flex flex-col gap-1.5', fromUser ? 'items-end' : 'items-start')}>
      <p className="sr-only">{fromUser ? 'You said:' : 'Co-pilot said:'}</p>
      <p
        className={cn(
          'max-w-[85%] rounded-card px-3.5 py-2 text-body break-words whitespace-pre-wrap transition-colors',
          fromUser ? 'bg-accent-fill text-on-accent' : 'bg-fill text-label',
        )}
      >
        {entry.content}
      </p>
      {entry.toolCalls.length > 0 && (
        <ul aria-label="What the co-pilot checked" className="flex max-w-[85%] flex-wrap gap-1">
          {entry.toolCalls.map((call, index) => (
            <li
              key={`${call.name}-${index.toString()}`}
              className="rounded-full bg-fill px-2 py-0.5 text-caption text-label"
            >
              {call.label}
            </li>
          ))}
        </ul>
      )}
      {entry.appliedPlan && (
        <p className="flex items-center gap-1.5 text-footnote text-label-secondary">
          <MapPinned aria-hidden className="size-3.5" />
          Showing this plan on the map
        </p>
      )}
    </li>
  );
}

/** The placeholder reply while the co-pilot works. */
export function ThinkingBubble() {
  return (
    <li className="flex items-start">
      <p role="status" className="rounded-card bg-fill px-3.5 py-2 text-body text-label">
        Thinking
        <span aria-hidden className="thinking-dots">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
        <span className="sr-only">…</span>
      </p>
    </li>
  );
}

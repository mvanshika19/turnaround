import { KeyRound, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useEffectEvent, useId, useRef } from 'react';

import { ErrorCard } from '@/components/ui/ErrorCard';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { cn } from '@/lib/cn';

import type { Copilot } from '../hooks/useCopilot';
import { Composer } from './Composer';
import { COPILOT_PANEL_ID } from './CopilotButton';
import { MessageBubble, ThinkingBubble } from './MessageBubble';
import { SuggestionChips } from './SuggestionChips';

const OFF_MESSAGE =
  'Turn on the co-pilot by adding an OpenAI API key to backend/.env as TURNAROUND_OPENAI_API_KEY, then restart the backend.';

interface CopilotPanelProps {
  copilot: Copilot;
  /** False when the backend reports no API key; the panel then explains how to turn it on. */
  enabled: boolean;
  /** A side panel on wide screens; a bottom sheet over the page below 1024 px. */
  isDesktop: boolean;
  onClose: () => void;
}

/** The co-pilot conversation. Escape or the close button dismisses it. */
export function CopilotPanel({ copilot, enabled, isDesktop, onClose }: CopilotPanelProps) {
  const titleId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isOff = !enabled || copilot.notConfigured;
  const { entries, isPending, error } = copilot;

  const close = useEffectEvent(onClose);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Keep the newest message in view.
  useEffect(() => {
    const scroller = scrollRef.current;
    scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
  }, [entries.length, isPending, error]);

  const offscreen = isDesktop ? { x: 'calc(100% + 16px)' } : { y: '100%' };

  return (
    <motion.section
      id={COPILOT_PANEL_ID}
      role="dialog"
      aria-modal={!isDesktop}
      aria-labelledby={titleId}
      initial={offscreen}
      animate={{ x: 0, y: 0 }}
      exit={offscreen}
      className={cn(
        'fixed z-30 flex flex-col overflow-hidden border-[0.5px] border-separator shadow-panel',
        isDesktop
          ? 'material top-[72px] right-4 bottom-4 w-[380px] rounded-panel'
          : 'inset-x-0 top-14 bottom-0 rounded-t-panel bg-surface',
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b-[0.5px] border-separator px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <h2 id={titleId} className="text-headline">
            Co-pilot
          </h2>
          <p className="text-footnote text-label-secondary">
            Answers come from the Turnaround planner.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close co-pilot"
          onClick={onClose}
          // With no composer to focus, focus starts on the close button.
          autoFocus={isOff}
          className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-label-secondary transition-colors hover:bg-fill lg:size-9"
        >
          <X aria-hidden className="size-5" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
        {isOff ? (
          <StatusMessage
            icon={KeyRound}
            title="The co-pilot is off"
            message={OFF_MESSAGE}
            className="py-8"
          />
        ) : entries.length === 0 && !isPending ? (
          <SuggestionChips onPick={copilot.send} />
        ) : (
          <div role="log" aria-label="Conversation" className="flex flex-col gap-4">
            <ol className="flex flex-col gap-4">
              {entries.map((entry) => (
                <MessageBubble key={entry.id} entry={entry} />
              ))}
              {isPending && <ThinkingBubble />}
            </ol>
            {error && !isPending && <ErrorCard message={error} onRetry={copilot.retry} />}
          </div>
        )}
      </div>

      {!isOff && <Composer isPending={isPending} onSend={copilot.send} />}
    </motion.section>
  );
}

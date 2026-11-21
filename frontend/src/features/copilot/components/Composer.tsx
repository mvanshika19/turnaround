import { ArrowUp } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

interface ComposerProps {
  isPending: boolean;
  onSend: (text: string) => void;
}

/** A textarea that grows to five lines. Enter sends; Shift+Enter starts a new line. */
export function Composer({ isPending, onSend }: ComposerProps) {
  const inputId = useId();
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    if (isPending || text.trim() === '') return;
    onSend(text);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = '';
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 border-t-[0.5px] border-separator p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:pb-3"
    >
      <label htmlFor={inputId} className="sr-only">
        Message the co-pilot
      </label>
      <textarea
        id={inputId}
        ref={textareaRef}
        // Focus lands here when the panel opens.
        autoFocus
        rows={1}
        value={text}
        placeholder="Ask about your hike"
        onChange={(event) => {
          setText(event.target.value);
          const field = event.target;
          field.style.height = 'auto';
          field.style.height = `${field.scrollHeight.toString()}px`;
        }}
        onKeyDown={handleKeyDown}
        className="max-h-[129px] min-h-11 flex-1 resize-none rounded-card border border-separator bg-surface px-3.5 py-[11px] text-body text-label transition-colors placeholder:text-label-secondary focus-visible:outline-2 focus-visible:outline-offset-0 lg:min-h-10"
      />
      <button
        type="submit"
        aria-label="Send"
        disabled={isPending}
        className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-fill text-on-accent transition-colors hover:bg-accent-fill-hover disabled:cursor-not-allowed disabled:opacity-40 lg:size-10"
      >
        <ArrowUp aria-hidden className="size-5" />
      </button>
    </form>
  );
}

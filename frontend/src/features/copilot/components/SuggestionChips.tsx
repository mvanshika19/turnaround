import { Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  'What’s the latest I can start?',
  'Which trail fits before dark tomorrow?',
  'What if I’m slower than usual?',
] as const;

/** The empty conversation: three questions that send as soon as they're tapped. */
export function SuggestionChips({ onPick }: { onPick: (question: string) => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="flex items-center gap-2 text-callout text-label-secondary">
        <Sparkles aria-hidden className="size-4 shrink-0" />
        Ask about start times, trails or your pace.
      </p>
      <ul className="flex flex-col items-start gap-2">
        {SUGGESTIONS.map((question) => (
          <li key={question}>
            <button
              type="button"
              onClick={() => {
                onPick(question);
              }}
              className="min-h-11 rounded-full border border-separator bg-surface px-3.5 text-left text-callout text-label transition-colors hover:bg-fill lg:min-h-9"
            >
              {question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

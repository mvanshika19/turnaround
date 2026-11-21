import { Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/Button';

export const COPILOT_BUTTON_ID = 'copilot-toggle';
export const COPILOT_PANEL_ID = 'copilot-panel';

interface CopilotButtonProps {
  open: boolean;
  onToggle: () => void;
}

/** Opens and closes the co-pilot. Icon-only on narrow phones, like Share plan. */
export function CopilotButton({ open, onToggle }: CopilotButtonProps) {
  return (
    <Button
      id={COPILOT_BUTTON_ID}
      variant="secondary"
      aria-expanded={open}
      aria-controls={COPILOT_PANEL_ID}
      onClick={onToggle}
      className="max-sm:w-11 max-sm:px-0"
    >
      <Sparkles aria-hidden className="size-4" />
      <span className="max-sm:sr-only">Ask co-pilot</span>
    </Button>
  );
}

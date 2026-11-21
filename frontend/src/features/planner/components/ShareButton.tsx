import { Share } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/useToast';
import { copyText } from '@/lib/clipboard';

interface ShareButtonProps {
  /** The current plan's id; the button is disabled until the plan on screen is current. */
  planId: string | undefined;
}

/** Copies a link to the read-only plan page. Icon-only on narrow phones to keep the header on one line. */
export function ShareButton({ planId }: ShareButtonProps) {
  const { showToast } = useToast();

  const share = async (id: string) => {
    const copied = await copyText(`${window.location.origin}/plan/${encodeURIComponent(id)}`);
    showToast(
      copied
        ? { message: 'Link copied', tone: 'success' }
        : { message: 'Couldn’t copy the link. Check your browser’s permissions.', tone: 'error' },
    );
  };

  return (
    <Button
      disabled={planId === undefined}
      onClick={() => {
        if (planId !== undefined) void share(planId);
      }}
      className="max-sm:w-11 max-sm:px-0"
    >
      <Share aria-hidden className="size-4" />
      <span className="max-sm:sr-only">Share plan</span>
    </Button>
  );
}

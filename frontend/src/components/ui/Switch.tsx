import { motion } from 'motion/react';
import { useId } from 'react';

import { cn } from '@/lib/cn';

interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Knob travel: track width (51) minus knob size (27) minus both 2 px insets. */
const KNOB_TRAVEL = 20;

/** An Apple-style on/off switch in a full-width row, labelled by the text beside it. */
export function Switch({ label, checked, onChange }: SwitchProps) {
  const id = useId();

  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <label htmlFor={id} className="cursor-pointer text-body select-none">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => {
          onChange(!checked);
        }}
        className={cn(
          'relative h-[31px] w-[51px] shrink-0 cursor-pointer rounded-full p-0.5 transition-colors',
          checked ? 'bg-accent' : 'bg-fill',
        )}
      >
        <motion.span
          aria-hidden
          initial={false}
          animate={{ x: checked ? KNOB_TRAVEL : 0 }}
          className="block size-[27px] rounded-full bg-knob shadow-knob"
        />
      </button>
    </div>
  );
}

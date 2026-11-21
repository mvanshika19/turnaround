import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { useElementSize } from '@/hooks/useElementSize';

/** Springs its height to fit its content, so cards grow and shrink instead of jumping. */
export function AnimatedHeight({ children }: { children: ReactNode }) {
  const [ref, size] = useElementSize<HTMLDivElement>();

  return (
    <motion.div
      initial={false}
      animate={{ height: size ? size.height : 'auto' }}
      className="overflow-hidden"
    >
      <div ref={ref}>{children}</div>
    </motion.div>
  );
}

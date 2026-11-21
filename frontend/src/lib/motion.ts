import type { Transition } from 'motion/react';

/** The one spring used for panels, thumbs and layout changes. */
export const SPRING: Transition = { type: 'spring', stiffness: 400, damping: 34 };

/** Short cross-fade for changing numbers and labels (kept under 220 ms). */
export const VALUE_FADE: Transition = { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] };

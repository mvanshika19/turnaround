import type { Tone } from './status';

/*
 * Tailwind class names per tone, written out in full so Tailwind can find them.
 * Pills use the `*-text` colour on a 14% tint of the base colour; lines and dots use the base.
 * Neutral pills sit on --fill, where only --label keeps text above 4.5:1 in light mode.
 */

export const TONE_PILL_CLASSES: Record<Tone, string> = {
  go: 'bg-go/14 text-go-text',
  caution: 'bg-caution/14 text-caution-text',
  danger: 'bg-danger/14 text-danger-text',
  snow: 'bg-snow/14 text-snow-text',
  neutral: 'bg-fill text-label',
};

export const TONE_TEXT_CLASSES: Record<Tone, string> = {
  go: 'text-go-text',
  caution: 'text-caution-text',
  danger: 'text-danger-text',
  snow: 'text-snow-text',
  neutral: 'text-label-secondary',
};

export const TONE_FILL_CLASSES: Record<Tone, string> = {
  go: 'bg-go',
  caution: 'bg-caution',
  danger: 'bg-danger',
  snow: 'bg-snow',
  neutral: 'bg-label-secondary',
};

export const TONE_STROKE_CLASSES: Record<Tone, string> = {
  go: 'stroke-go',
  caution: 'stroke-caution',
  danger: 'stroke-danger',
  snow: 'stroke-snow',
  neutral: 'stroke-label-secondary',
};

/** CSS custom properties holding each tone's base colour, for canvases such as the map. */
export const TONE_COLOR_VARIABLES: Record<Tone, string> = {
  go: '--go',
  caution: '--caution',
  danger: '--danger',
  snow: '--snow',
  neutral: '--label-secondary',
};

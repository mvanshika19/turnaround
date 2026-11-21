import type { LucideIcon } from 'lucide-react';
import {
  CircleCheck,
  Clock,
  Flashlight,
  Info,
  Moon,
  MoonStar,
  OctagonX,
  Snowflake,
  Sun,
  TriangleAlert,
} from 'lucide-react';

import type { Difficulty, SegmentStatus, VerdictLevel } from '@/api/types';

/** The semantic colour families. Each maps to a base token and a `*-text` token. */
export type Tone = 'go' | 'caution' | 'danger' | 'snow' | 'neutral';

interface VerdictPresentation {
  label: string;
  tone: Tone;
  icon: LucideIcon;
}

export const VERDICTS: Record<VerdictLevel, VerdictPresentation> = {
  go: { label: 'Go', tone: 'go', icon: CircleCheck },
  caution: { label: 'Caution', tone: 'caution', icon: TriangleAlert },
  no_go: { label: 'Not today', tone: 'danger', icon: OctagonX },
};

const REASON_ICONS = new Map<string, LucideIcon>([
  ['after_dark', Moon],
  ['past_midnight', MoonStar],
  ['headlamp_needed', Flashlight],
  ['tight_daylight', Clock],
  ['daylight_ok', Sun],
  ['snow_no_traction', Snowflake],
  ['snow_with_traction', Snowflake],
]);

/** The icon for a reason code; unknown codes get a neutral info icon. */
export function reasonIcon(code: string): LucideIcon {
  return REASON_ICONS.get(code) ?? Info;
}

export const SEGMENT_STATUSES: Record<SegmentStatus, { label: string; tone: Tone }> = {
  daylight: { label: 'Daylight', tone: 'go' },
  snow: { label: 'Snow likely', tone: 'snow' },
  dark: { label: 'After dark', tone: 'danger' },
};

const STATUS_SEVERITY: Record<SegmentStatus, number> = { daylight: 0, snow: 1, dark: 2 };

/** The more severe of two point conditions (dark beats snow beats daylight). */
export function worseStatus(
  a: SegmentStatus | null,
  b: SegmentStatus | null,
): SegmentStatus | null {
  if (a === null) return b;
  if (b === null) return a;
  return STATUS_SEVERITY[a] >= STATUS_SEVERITY[b] ? a : b;
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
};

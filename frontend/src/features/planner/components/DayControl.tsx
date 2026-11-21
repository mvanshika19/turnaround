import type { IsoDate } from '@/api/types';
import { AnimatedText } from '@/components/ui/AnimatedText';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { SegmentOption } from '@/components/ui/SegmentedControl';
import { formatLongDate, formatShortDate } from '@/lib/time';

import type { DayChoice } from '../hooks/usePlannerState';
import { ControlSection } from './ControlSection';

const OPTIONS: readonly SegmentOption<DayChoice>[] = [
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
];

interface DayControlProps {
  day: DayChoice;
  /** The chosen calendar date in Vancouver, once the backend has said what today is. */
  date: IsoDate | undefined;
  onChange: (day: DayChoice) => void;
}

/** Today / Tomorrow, plus a third segment while a co-pilot suggestion is for another date. */
export function DayControl({ day, date, onChange }: DayControlProps) {
  const options =
    day === 'custom' && date
      ? [...OPTIONS, { value: 'custom' as const, label: formatShortDate(date) }]
      : OPTIONS;

  return (
    <ControlSection
      title="Day"
      aside={
        date && (
          <AnimatedText
            value={formatLongDate(date)}
            className="text-footnote text-label-secondary"
          />
        )
      }
    >
      <SegmentedControl label="Day" options={options} value={day} onChange={onChange} />
    </ControlSection>
  );
}

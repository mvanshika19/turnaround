import type { Fitness } from '@/api/types';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { SegmentOption } from '@/components/ui/SegmentedControl';

import { ControlSection } from './ControlSection';

const OPTIONS: readonly SegmentOption<Fitness>[] = [
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'average', label: 'Average' },
  { value: 'fast', label: 'Fast' },
];

interface FitnessControlProps {
  fitness: Fitness;
  onChange: (fitness: Fitness) => void;
}

export function FitnessControl({ fitness, onChange }: FitnessControlProps) {
  return (
    <ControlSection title="Fitness">
      <SegmentedControl label="Fitness" options={OPTIONS} value={fitness} onChange={onChange} />
    </ControlSection>
  );
}

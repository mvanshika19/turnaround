import type { Gear } from '@/api/types';
import { Switch } from '@/components/ui/Switch';

import { ControlSection } from './ControlSection';

interface GearControlsProps {
  gear: Gear;
  onChange: (item: keyof Gear, enabled: boolean) => void;
}

export function GearControls({ gear, onChange }: GearControlsProps) {
  return (
    <ControlSection title="Gear">
      <div className="flex flex-col divide-y-[0.5px] divide-separator">
        <Switch
          label="Headlamp"
          checked={gear.headlamp}
          onChange={(enabled) => {
            onChange('headlamp', enabled);
          }}
        />
        <Switch
          label="Traction (microspikes)"
          checked={gear.traction}
          onChange={(enabled) => {
            onChange('traction', enabled);
          }}
        />
      </div>
    </ControlSection>
  );
}

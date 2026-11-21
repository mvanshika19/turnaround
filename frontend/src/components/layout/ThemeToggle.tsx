import { Monitor, Moon, Sun } from 'lucide-react';

import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { SegmentOption } from '@/components/ui/SegmentedControl';
import type { ThemePreference } from '@/theme/themeContext';
import { useTheme } from '@/theme/useTheme';

const OPTIONS: readonly SegmentOption<ThemePreference>[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Match system', icon: Monitor },
];

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <SegmentedControl
      label="Appearance"
      options={OPTIONS}
      value={preference}
      onChange={setPreference}
      iconOnly
    />
  );
}

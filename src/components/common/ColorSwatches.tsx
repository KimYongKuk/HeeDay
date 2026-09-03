'use client';

import { PALETTE } from '@/lib/domain/colors';
import { COLOR_KEYS, type ColorKey } from '@/lib/domain/enums';
import { cn } from '@/lib/utils';

export function ColorSwatches({
  value,
  onChange,
  size = 20,
}: {
  value: ColorKey;
  onChange: (c: ColorKey) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="색상">
      {COLOR_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          aria-label={PALETTE[key].label}
          title={PALETTE[key].label}
          onClick={() => onChange(key)}
          className={cn(
            'focus-visible:ring-ring/50 rounded-md transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:outline-none',
            value === key && 'outline-ink outline-2 outline-offset-2',
          )}
          style={{ width: size, height: size, background: PALETTE[key].solid }}
        />
      ))}
    </div>
  );
}

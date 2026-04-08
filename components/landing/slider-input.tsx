/**
 * components/landing/slider-input.tsx
 *
 * Labelled slider row used in the Adjust Your Scenario card. Renders:
 *   [ Label ............... Formatted value ]
 *   [ ─────────●──────────────────────────── ]
 *
 * Owns no state; the parent <FireCalculator> holds the scenario and
 * passes down (value, onChange). The Slider primitive is driven as a
 * controlled single-thumb slider (value is an array with one element
 * under the hood).
 */

'use client';

import { Slider } from '@/components/ui/slider';

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Formatter for the readout on the right side of the label row. */
  format: (value: number) => string;
}

export function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: SliderInputProps) {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wide text-[#A3A3A3]">
          {label}
        </span>
        <span className="text-sm font-medium tabular-nums text-[#FAFAFA]">
          {format(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(next) => {
          if (Array.isArray(next)) {
            onChange(next[0]);
          } else {
            onChange(next);
          }
        }}
        min={min}
        max={max}
        step={step}
      />
    </div>
  );
}

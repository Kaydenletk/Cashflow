/**
 * components/ui/slider.tsx
 *
 * Thin wrapper around @base-ui/react/slider that supplies Compound's dark
 * palette (neutral track, emerald indicator + thumb) and a slightly larger
 * thumb on touch-sized viewports. The generic preserves @base-ui's value
 * type so both `number` and `readonly number[]` callers keep full type
 * inference.
 *
 * Keyboard support (arrow keys, Home/End, PageUp/PageDown) is inherited
 * from the primitive — no extra wiring needed.
 *
 * Usage:
 *   <Slider value={[age]} onValueChange={(v) => setAge(v[0])} min={18} max={70} />
 */

'use client';

import { Slider as SliderPrimitive } from '@base-ui/react/slider';

import { cn } from '@/lib/utils';

function Slider<Value extends number | readonly number[]>({
  className,
  ...props
}: SliderPrimitive.Root.Props<Value>) {
  return (
    <SliderPrimitive.Root
      className={cn('relative flex w-full items-center select-none', className)}
      {...props}
    >
      <SliderPrimitive.Control className="relative flex h-5 w-full items-center">
        <SliderPrimitive.Track className="relative h-1.5 w-full rounded-full bg-[#262626]">
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-[#10B981]" />
          <SliderPrimitive.Thumb
            className={cn(
              'block rounded-full border-2 border-[#10B981] bg-[#0A0A0A] shadow-md outline-none transition-transform',
              'focus-visible:ring-4 focus-visible:ring-[#10B981]/30',
              'active:scale-110',
              'h-5 w-5 md:h-4 md:w-4',
            )}
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };

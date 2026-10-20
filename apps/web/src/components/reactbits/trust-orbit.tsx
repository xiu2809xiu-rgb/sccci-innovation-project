/*
 * React Bits Pro block auth-4 ("Split sign-in with an orbital trust ring", @reactbits-pro/auth-4,
 * licensed): the orbital ring from its aside. Adapted for HuiTong: any centrepiece instead of a logo
 * tile, chips passed in, ring sizes relative to the stage so it scales down with the layout, and token
 * colours. The block's spinning orbit and floating chips are dropped: the centrepiece is the one thing
 * that moves (one ambient effect per viewport, and WCAG 2.2.2 for motion beside the sign-in form).
 */
'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

// The block's 160, 280, 400 and 520 px rings and its 340 px dashed orbit, as shares of the stage.
const RINGS = ['size-[31%]', 'size-[54%]', 'size-[77%]', 'size-full'] as const;
// From `sm` up, one chip above and two below the middle band, where a moving centrepiece (the 3D
// systems on the sign-in page) spends its time, so a chip never covers it. Shares of the stage.
// Phones are too narrow for floating chips, so there they wrap in a row under the orbit.
const CHIP_ANCHORS = [
  'sm:top-[12%] sm:left-1/2',
  'sm:top-[80%] sm:left-[76%]',
  'sm:top-[87%] sm:left-[27%]',
] as const;

export interface TrustOrbitChip {
  id: string;
  label: string;
  icon: ReactNode;
}

export interface TrustOrbitProps {
  /** What sits at the centre of the orbit; it fills the inner 80 % of the stage. */
  centre: ReactNode;
  /** Up to three short claims placed on the orbit. */
  chips: readonly TrustOrbitChip[];
  className?: string;
}

/** Concentric rings and a dashed orbit around a centrepiece, with claim chips on the orbit. */
export function TrustOrbit({ centre, chips, className }: TrustOrbitProps) {
  return (
    <div className={cn('relative w-full', className)}>
      <div className="relative aspect-square">
        {RINGS.map((size) => (
          <span
            key={size}
            aria-hidden="true"
            className={cn(
              'absolute top-1/2 left-1/2 -translate-1/2 rounded-full border border-border-strong',
              size,
            )}
          />
        ))}
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 size-[65%] -translate-1/2 rounded-full border border-dashed border-subtle-foreground/50"
        />
        <div className="absolute inset-[10%]">{centre}</div>
      </div>
      {/* From `sm` the list takes no space and its items sit on the stage above. */}
      <ul className="mt-4 flex flex-wrap justify-center gap-2 sm:mt-0 sm:block">
        {chips.slice(0, CHIP_ANCHORS.length).map((chip, index) => (
          <li key={chip.id} className={cn('sm:absolute sm:-translate-1/2', CHIP_ANCHORS[index])}>
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium whitespace-nowrap text-foreground shadow-xs">
              {chip.icon}
              {chip.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

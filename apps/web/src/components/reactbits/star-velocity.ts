// The settle rule behind StarBorder (WCAG 2.2.2), kept apart from the component so it can be tested.

/**
 * The star's speed for the next frame, in pixels per second along the border. It eases towards
 * `cruise` until `elapsed` reaches `settleAfter`, then glides to a full stop within about a second
 * instead of creeping on forever.
 */
export function starVelocity(
  current: number,
  cruise: number,
  elapsed: number,
  settleAfter: number,
  dt: number,
): number {
  const settled = elapsed >= settleAfter;
  const target = settled ? 0 : cruise;
  const next = current + (target - current) * (1 - Math.exp(-dt / (settled ? 0.15 : 0.45)));
  return settled && Math.abs(next) < 1 ? 0 : next;
}

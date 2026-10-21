/** Where a spring is and how fast it is moving. */
export interface SpringState {
  position: number;
  velocity: number;
}

/**
 * One step of a critically damped spring towards `target`: it eases in and
 * settles without overshoot. The step is the spring's exact solution, so it
 * moves the same at any frame rate, and a long step (the first frame after a
 * pause) lands on the target. `omega` sets the stiffness: it settles in about
 * 6.6 / omega seconds.
 */
export function springStep(
  { position, velocity }: SpringState,
  target: number,
  omega: number,
  delta: number,
): SpringState {
  const offset = position - target;
  const decay = Math.exp(-omega * delta);
  const drift = (velocity + omega * offset) * delta;
  return {
    position: target + (offset + drift) * decay,
    velocity: (velocity - omega * drift) * decay,
  };
}

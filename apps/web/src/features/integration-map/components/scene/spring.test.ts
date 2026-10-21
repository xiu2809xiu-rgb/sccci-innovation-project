import { describe, expect, it } from 'vitest';

import { springStep, type SpringState } from './spring';

function run(state: SpringState, target: number, steps: number, delta: number): SpringState {
  let next = state;
  for (let step = 0; step < steps; step += 1) next = springStep(next, target, 16, delta);
  return next;
}

describe('springStep', () => {
  it('settles on the target without overshooting it', () => {
    let state: SpringState = { position: 0, velocity: 0 };
    let highest = 0;
    for (let step = 0; step < 120; step += 1) {
      state = springStep(state, 1, 16, 1 / 60);
      highest = Math.max(highest, state.position);
    }
    expect(state.position).toBeCloseTo(1, 4);
    expect(highest).toBeLessThanOrEqual(1);
  });

  it('eases in: it starts from rest rather than at full speed', () => {
    const first = springStep({ position: 0, velocity: 0 }, 1, 16, 1 / 60);
    expect(first.position).toBeLessThan(0.05);
    expect(first.velocity).toBeGreaterThan(0);
  });

  it('moves the same at 30, 60 and 144 frames a second', () => {
    const start: SpringState = { position: 0, velocity: 0 };
    // Half a second at each rate.
    const at60 = run(start, 1, 30, 1 / 60);
    expect(run(start, 1, 15, 1 / 30).position).toBeCloseTo(at60.position, 10);
    expect(run(start, 1, 72, 1 / 144).position).toBeCloseTo(at60.position, 10);
  });

  it('lands on the target after a long pause', () => {
    expect(springStep({ position: 0, velocity: 0 }, 1, 16, 10).position).toBeCloseTo(1, 10);
  });
});

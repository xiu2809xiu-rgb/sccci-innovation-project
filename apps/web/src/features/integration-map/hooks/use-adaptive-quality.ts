import { useReducer } from 'react';

/** High draws at the device's pixel ratio (up to 2) with the depth blur and multisampling; low draws at 1 without them. */
export type SceneQuality = 'high' | 'low';

export interface QualityState {
  quality: SceneQuality;
  /** How many times the quality has changed direction. */
  changes: number;
  /** True once the quality has settled for good. */
  settled: boolean;
}

/** The changes of direction allowed before a device that keeps swinging settles on low quality. */
export const MAX_QUALITY_CHANGES = 3;

const INITIAL: QualityState = { quality: 'high', changes: 0, settled: false };

/**
 * The next quality after drei's PerformanceMonitor inclines or declines.
 * drei counts every incline towards its flip-flop limit, so its own fallback
 * locks even a fast device to low quality after a few seconds of inclining;
 * this counts only real changes of direction.
 */
export function nextQuality(state: QualityState, next: SceneQuality): QualityState {
  if (state.settled || next === state.quality) return state;
  const changes = state.changes + 1;
  return changes > MAX_QUALITY_CHANGES
    ? { quality: 'low', changes, settled: true }
    : { quality: next, changes, settled: false };
}

/** The scene's adaptive quality and the function the performance monitor steps it with. */
export function useAdaptiveQuality(): {
  quality: SceneQuality;
  adapt: (next: SceneQuality) => void;
} {
  const [state, adapt] = useReducer(nextQuality, INITIAL);
  return { quality: state.quality, adapt };
}

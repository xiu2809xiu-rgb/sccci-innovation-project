import { describe, expect, it } from 'vitest';

import { MAX_QUALITY_CHANGES, nextQuality, type QualityState } from './use-adaptive-quality';

const start: QualityState = { quality: 'high', changes: 0, settled: false };

describe('nextQuality', () => {
  it('stays high on a device that keeps inclining, however long it runs', () => {
    let state = start;
    for (let window = 0; window < 50; window += 1) state = nextQuality(state, 'high');
    expect(state).toEqual(start);
  });

  it('drops to low on a decline and comes back on an incline', () => {
    const low = nextQuality(start, 'low');
    expect(low).toEqual({ quality: 'low', changes: 1, settled: false });
    expect(nextQuality(low, 'high')).toEqual({ quality: 'high', changes: 2, settled: false });
  });

  it('settles on low for good once the quality keeps swinging', () => {
    let state = start;
    for (let change = 0; change <= MAX_QUALITY_CHANGES; change += 1) {
      state = nextQuality(state, state.quality === 'high' ? 'low' : 'high');
    }
    expect(state).toMatchObject({ quality: 'low', settled: true });
    expect(nextQuality(state, 'high')).toBe(state);
  });
});

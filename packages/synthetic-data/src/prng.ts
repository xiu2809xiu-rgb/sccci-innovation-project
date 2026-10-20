/**
 * Deterministic pseudo-random numbers (mulberry32). The whole dataset is derived
 * from one seed, so every run, test and container sees identical data.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Next float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** True with probability `p`. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** One element of a non-empty list. */
  pick<T>(items: readonly T[]): T {
    const item = items[Math.floor(this.next() * items.length)];
    if (item === undefined) {
      throw new Error('Cannot pick from an empty list');
    }
    return item;
  }

  /** A shuffled copy (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.next() * (i + 1));
      const a = copy[i] as T;
      copy[i] = copy[j] as T;
      copy[j] = a;
    }
    return copy;
  }

  /**
   * An independent generator for one concern. Streams are keyed by label, so
   * adding draws in one generator never shifts the values of another.
   */
  fork(label: string): SeededRandom {
    let hash = this.state ^ 0x811c9dc5;
    for (let i = 0; i < label.length; i += 1) {
      hash = Math.imul(hash ^ label.charCodeAt(i), 0x01000193);
    }
    return new SeededRandom(hash >>> 0);
  }
}

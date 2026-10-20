import { canonicalJson, toJsonValue } from './canonical-json.js';

describe('canonicalJson', () => {
  it('produces the same string regardless of key order, at every depth', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: [{ y: 1, x: 2 }] } })).toBe(
      canonicalJson({ a: { c: [{ x: 2, y: 1 }], d: 2 }, b: 1 }),
    );
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('serialises dates and objects with toJSON, and drops undefined values', () => {
    const decimalLike = { toJSON: () => '5800.00' };
    expect(
      canonicalJson({
        at: new Date('2026-10-20T00:00:00.000Z'),
        amount: decimalLike,
        gone: undefined,
      }),
    ).toBe('{"amount":"5800.00","at":"2026-10-20T00:00:00.000Z"}');
  });

  it('turns values into plain JSON for storage', () => {
    expect(toJsonValue(undefined)).toBeUndefined();
    expect(toJsonValue({ at: new Date('2026-10-20T00:00:00.000Z') })).toEqual({
      at: '2026-10-20T00:00:00.000Z',
    });
  });
});

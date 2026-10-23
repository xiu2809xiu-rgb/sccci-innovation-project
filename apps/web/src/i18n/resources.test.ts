import { describe, expect, it } from 'vitest';

import { NAMESPACES, resources } from './resources';

type Tree = Readonly<Record<string, unknown>>;

/** Flattens nested translation objects into `a.b.c` keys with their string values. */
function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      entries.set(path, value);
    } else if (value !== null && typeof value === 'object') {
      for (const [nested, text] of flatten(value as Tree, path)) {
        entries.set(nested, text);
      }
    }
  }
  return entries;
}

function placeholders(text: string): string[] {
  // A format after the name (`{{count, number}}`) is part of the same variable.
  return [...text.matchAll(/{{\s*(\w+)\s*(?:,[^}]*)?}}/g)].map((match) => match[1] ?? '').sort();
}

describe.each(NAMESPACES)('the %s namespace', (namespace) => {
  const english = flatten(resources.en[namespace]);
  const chinese = flatten(resources['zh-CN'][namespace]);

  it('has the same keys in English and Simplified Chinese', () => {
    expect([...chinese.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it('has no empty strings', () => {
    const empty = [...english, ...chinese].filter(([, text]) => text.trim() === '');
    expect(empty).toEqual([]);
  });

  it('uses the same interpolation variables in both languages', () => {
    const mismatched = [...english].filter(
      ([key, text]) => placeholders(text).join() !== placeholders(chinese.get(key) ?? '').join(),
    );
    expect(mismatched).toEqual([]);
  });
});

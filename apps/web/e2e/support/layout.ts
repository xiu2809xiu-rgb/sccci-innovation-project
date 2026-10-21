import { expect, type Page } from '@playwright/test';

/** Wide tables scroll inside their own regions, or fit; the page itself never scrolls sideways. */
export async function expectNoSidewaysScroll(page: Page): Promise<void> {
  // A string expression, because the e2e TypeScript config has no DOM types.
  const overflow = await page.evaluate<number>(
    'document.documentElement.scrollWidth - document.documentElement.clientWidth',
  );
  expect(overflow).toBe(0);
}

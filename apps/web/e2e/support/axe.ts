import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/** WCAG 2.2 AA, as CLAUDE.md section 8 requires. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Fails on every violation axe can find on the page as it stands. */
export async function expectNoAxeViolations(page: Page, where: string): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} at ${violation.nodes.map((node) => node.html.slice(0, 160)).join(' | ')}`,
  );
  expect(summary, `axe violations on ${where}`).toEqual([]);
}

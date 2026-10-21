import { expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './support/axe.ts';
import { DEMO_ROLES, signInAs } from './support/demo-session.ts';

/**
 * E2E #2 (docs/agile/hero-journey.md): a new subsidiary joins without a code
 * change. An unfamiliar export (the synthetic Malaysia sample) gets AI
 * mapping suggestions, HR approves them, and the approved mapping is saved as
 * a version that a later import uses.
 */
test.describe('E2E #2: a new subsidiary joins without a code change', () => {
  test('the AI suggests a mapping, HR approves it, and a version is saved (area 1, E-1 and E-2)', async ({
    page,
  }) => {
    await test.step('sign in as Singapore HR and upload the unfamiliar export', async () => {
      await signInAs(page, DEMO_ROLES.hrSingapore);
      await page.goto('/connectors/new-mapping');
      await page.getByRole('button', { name: 'Use the synthetic Malaysia sample' }).click();
      await expect(
        page.getByText('organisation-e-malaysia-hr-export.csv', { exact: false }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Get the AI proposal' }).click();
    });

    await test.step('the suggestions are labelled honestly and need approval', async () => {
      await expect(page.getByRole('table', { name: /^Proposed mapping for / })).toBeVisible();
      await expect(page.getByText('Requires approval')).toBeVisible();
      // The default provider is deterministic; the wizard must not pass it off as a real model.
      await expect(page.getByRole('button', { name: 'Mock AI' })).toBeVisible();
      await expect(page.getByText('Never mapped: national ID numbers').first()).toBeVisible();
      await expectNoAxeViolations(page, 'the wizard review step');
    });

    await test.step('HR approves, and the mapping is saved as a version', async () => {
      await page.getByRole('button', { name: 'Continue to approval' }).click();
      // A fresh name each run: every approval creates a draft file connector.
      const suffix = String(Date.now());
      await page.getByLabel('Name', { exact: true }).fill(`Organisation E Malaysia HR ${suffix}`);
      await page.getByLabel('Name in Chinese').fill(`马来西亚人力资源系统 ${suffix}`);
      await page
        .getByLabel(
          'I have reviewed every mapping. I understand that nothing is imported until a sync runs.',
        )
        .check();
      await page.getByRole('button', { name: 'Approve and save' }).click();
      await expect(page.getByText(/^Mapping version \d+ saved$/)).toBeVisible();
    });
  });

  test('the full file imports through the approved mapping, with no code change (area 1)', () => {
    test.fixme(true, 'A-5 builds the import of a file connector through its approved mapping');
  });
});

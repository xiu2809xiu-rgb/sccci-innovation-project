import path from 'node:path';

import { expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './support/axe.ts';
import { DEMO_ROLES, signInAs } from './support/demo-session.ts';

/** The synthetic Malaysia export the wizard offers as its sample, imported here in full. */
const MALAYSIA_EXPORT = path.resolve(
  import.meta.dirname,
  '../public/samples/organisation-e-malaysia-hr-export.csv',
);

/** The file connector the approval creates, which the import then uses. */
let approved: { name: string; path: string } | null = null;

/**
 * E2E #2 (docs/agile/hero-journey.md): a new subsidiary joins without a code
 * change. An unfamiliar export (the synthetic Malaysia sample) gets AI
 * mapping suggestions, HR approves them, and the approved mapping is saved as
 * a version that a later import uses.
 */
test.describe('E2E #2: a new subsidiary joins without a code change', () => {
  // The import uses the connector the approval created, so the two run in order.
  test.describe.configure({ mode: 'serial' });

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
      const name = `Organisation E Malaysia HR ${suffix}`;
      await page.getByLabel('Name', { exact: true }).fill(name);
      await page.getByLabel('Name in Chinese').fill(`马来西亚人力资源系统 ${suffix}`);
      await page
        .getByLabel(
          'I have reviewed every mapping. I understand that nothing is imported until a sync runs.',
        )
        .check();
      await page.getByRole('button', { name: 'Approve and save' }).click();
      await expect(page.getByText(/^Mapping version \d+ saved$/)).toBeVisible();
      const href = await page
        .getByRole('link', { name: 'Open the connector' })
        .getAttribute('href');
      expect(href).toMatch(/^\/connectors\/[a-z0-9-]+$/);
      approved = { name, path: href ?? '' };
    });
  });

  test('the full file imports through the approved mapping, with no code change (area 1, A-5)', async ({
    page,
  }) => {
    if (!approved) throw new Error('the approval test did not create a connector');
    const { name, path: connectorPath } = approved;
    const pageHeader = page
      .locator('header')
      .filter({ has: page.getByRole('heading', { level: 1, name }) });

    await test.step('HR stages the whole export on the new draft connector', async () => {
      await signInAs(page, DEMO_ROLES.hrSingapore);
      await page.goto(connectorPath);
      await expect(pageHeader.getByText('Draft', { exact: true })).toBeVisible();
      await page.getByLabel('Export file').setInputFiles(MALAYSIA_EXPORT);
      await page.getByRole('button', { name: 'Stage the file' }).click();
      await expect(page.getByText('12 rows are staged. Sync now previews them.')).toBeVisible();
      const summary = page.getByRole('region', { name: 'Staged file' });
      // Only what the mapping reads is kept, and never the national ID column.
      await expect(summary.getByText(/^Never kept: “IC No\.”/)).toBeVisible();
      await expectNoAxeViolations(page, 'the staged import');
    });

    await test.step('Sync now previews the file before anything is written', async () => {
      await page.getByRole('button', { name: 'Sync now' }).click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('radio', { name: new RegExp(name) })).toBeChecked();
      await dialog.getByRole('button', { name: 'Preview changes' }).click();
      // A fresh stack, as on CI's first attempt, has none of the file's employees, so every
      // row is new. A stack that ran this test before has them already, and the preview says so.
      const fresh = Boolean(process.env.CI) && test.info().retry === 0;
      const slider = dialog.getByRole('slider', { name: 'Slide to apply these changes' });
      const nothingLeft = dialog.getByText(
        /^(Everything is already in sync|Nothing can be applied)/,
      );
      await expect(fresh ? slider : slider.or(nothingLeft)).toBeVisible({ timeout: 30_000 });
      if (await nothingLeft.isVisible()) return;

      await expect(
        dialog.getByRole('table', { name: 'Changes the sync would make' }),
      ).toBeVisible();
      await expectNoAxeViolations(page, 'the import preview');
      await slider.focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Enter');
      await expect(
        dialog.getByText(
          'The previewed changes are in the employee master, and each one is in the audit log.',
        ),
      ).toBeVisible({ timeout: 30_000 });
      await expect(dialog.getByRole('heading', { name: `Sync from ${name}` })).toBeVisible();
      await expectNoAxeViolations(page, 'the applied import');
      await page.keyboard.press('Escape');

      // The first applied import makes the draft connector active and deletes the staged file,
      // and the page shows it without a reload.
      await expect(pageHeader.getByText('Active', { exact: true })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Staged file' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Sync now' })).toHaveCount(0);
    });
  });
});

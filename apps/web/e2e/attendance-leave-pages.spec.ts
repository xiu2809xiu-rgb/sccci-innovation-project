import { expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './support/axe.ts';
import { DEMO_ROLES, signInAs } from './support/demo-session.ts';
import { expectNoSidewaysScroll } from './support/layout.ts';

/**
 * Area 3's screens through the real stack, with axe on each. The rules and
 * the template are real data; runs, rows and the report are typed sample data
 * until area 3 builds its engine. Nothing here depends on which month it is.
 */
test.describe('Attendance, leave and reports (area 3)', () => {
  test('consolidation, the category rules and the template preview', async ({ page }) => {
    await signInAs(page, DEMO_ROLES.hrSingapore);

    await test.step('the runs, with the newest run open', async () => {
      await page.goto('/attendance-leave');
      await expect(page.getByRole('table', { name: 'Consolidation runs' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Exceptions' })).toBeVisible();
      await expectNoAxeViolations(page, 'consolidation');
    });

    await test.step('the leave-category rules read from the database', async () => {
      await page.getByRole('link', { name: 'Category rules' }).click();
      const table = page.getByRole('table', { name: 'Leave-category rules' });
      await expect(table.getByRole('cell', { name: '年假' })).toBeVisible();
      await expectNoAxeViolations(page, 'the category rules');
    });

    await test.step('a month in the company template', async () => {
      await page.getByRole('link', { name: 'Template preview' }).click();
      await expect(page.getByRole('heading', { level: 1, name: 'Template preview' })).toBeVisible();
      await expectNoSidewaysScroll(page);
      await expectNoAxeViolations(page, 'the template preview');
    });
  });

  test('the management report, read-only', async ({ page }) => {
    await signInAs(page, DEMO_ROLES.management);
    await page.goto('/reports');
    await expect(page.getByText('Read only')).toBeVisible();
    await expectNoAxeViolations(page, 'the management report');
  });
});

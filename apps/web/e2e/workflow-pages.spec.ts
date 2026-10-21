import { expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './support/axe.ts';
import { DEMO_ROLES, signInAs } from './support/demo-session.ts';

/**
 * Area 2's screens through the real stack, with axe on each. Until area 2
 * builds its engine the API serves typed sample data, which every page labels;
 * these checks hold for the real data too, so they stay when it lands.
 */
test.describe('Workflow pages (area 2)', () => {
  test('the board, the timeline and one instance', async ({ page }) => {
    await signInAs(page, DEMO_ROLES.hrSingapore);

    await test.step('the board shows a column per step', async () => {
      await page.goto('/workflows');
      const board = page.getByRole('region', { name: 'Pipeline board, one column per step' });
      await expect(board.getByRole('region').first()).toBeVisible();
      // The columns scroll inside the board; the page itself never scrolls sideways.
      // A string expression, because the e2e TypeScript config has no DOM types.
      const overflow = await page.evaluate<number>(
        'document.documentElement.scrollWidth - document.documentElement.clientWidth',
      );
      expect(overflow).toBe(0);
      await expectNoAxeViolations(page, 'the workflow board');
    });

    await test.step('the timeline says in words what the bars show', async () => {
      await page.getByRole('tab', { name: 'Timeline' }).click();
      await expect(
        page.getByRole('list', {
          name: 'Workflows on a timeline, from OA approval to the requested day one',
        }),
      ).toBeVisible();
      await expectNoAxeViolations(page, 'the workflow timeline');
    });

    await test.step('an instance shows its steps, approvals, record and history', async () => {
      await page.getByRole('tab', { name: 'Board' }).click();
      await page
        .getByRole('region', { name: 'Pipeline board, one column per step' })
        .getByRole('link')
        .first()
        .click();
      await expect(page.getByRole('region', { name: 'Steps' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Approval in OA' })).toBeVisible();
      await expectNoAxeViolations(page, 'a workflow instance');
    });
  });

  test('the task list for admin operations', async ({ page }) => {
    await signInAs(page, DEMO_ROLES.adminOps);
    await page.goto('/workflows/tasks');
    await expect(page.getByRole('table', { name: 'Workflow tasks' })).toBeVisible();
    await expectNoAxeViolations(page, 'the workflow tasks');
  });
});

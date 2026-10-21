import { expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './support/axe.ts';
import { DEMO_ROLES, signInAs } from './support/demo-session.ts';
import { expectNoSidewaysScroll } from './support/layout.ts';

/**
 * Area 4's screens through the real stack, with axe on each. The registers
 * and the audit log are real data; the dashboards are typed sample data until
 * area 4 builds the aggregations.
 */
test.describe('Governance, the audit log and analytics (area 4)', () => {
  test('the registers and the audit log, as an auditor', async ({ page }) => {
    await signInAs(page, DEMO_ROLES.auditor);

    await test.step('the access policy, which fits at 1024 px', async () => {
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.goto('/governance');
      await expect(page.getByRole('table', { name: 'Permissions each role holds' })).toBeVisible();
      await expectNoSidewaysScroll(page);
      await page.setViewportSize({ width: 1280, height: 720 });
      await expectNoAxeViolations(page, 'the access policy');
    });

    await test.step('the classification register', async () => {
      await page.getByRole('link', { name: 'Classification', exact: true }).click();
      const table = page.getByRole('table', { name: 'Classified fields' });
      await expect(table.getByRole('row', { name: /Base salary/ })).toBeVisible();
      await expectNoAxeViolations(page, 'the classification register');
    });

    await test.step('the transfer register', async () => {
      await page.getByRole('link', { name: 'Transfers', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'SG01 employee master to Group HQ' }),
      ).toBeVisible();
      await expectNoAxeViolations(page, 'the transfer register');
    });

    await test.step('retention', async () => {
      await page.getByRole('link', { name: 'Retention', exact: true }).click();
      await expect(page.getByRole('table', { name: 'Retention rules' })).toBeVisible();
      await expectNoAxeViolations(page, 'retention');
    });

    await test.step('the audit log, and its hash chain checked', async () => {
      await page
        .getByRole('navigation', { name: 'Governance sections' })
        .getByRole('link', { name: 'Audit log' })
        .click();
      await expect(page.getByRole('table', { name: 'Audit events' })).toBeVisible();
      await page.getByRole('button', { name: 'Check the chain' }).click();
      await expect(page.getByText(/^Intact: /)).toBeVisible();
      await expectNoSidewaysScroll(page);
      await expectNoAxeViolations(page, 'the audit log');
    });
  });

  test('the monitoring dashboards', async ({ page }) => {
    await signInAs(page, DEMO_ROLES.auditor);

    await test.step('observability', async () => {
      await page.goto('/analytics');
      await expect(page.getByRole('region', { name: 'Services' })).toBeVisible();
      await expectNoAxeViolations(page, 'observability');
      // Every chart has its figures as a real table; open one and check it too.
      await page.getByText('Show as a table').first().click();
      await expect(page.getByRole('table', { name: 'Requests and errors per day' })).toBeVisible();
      await expectNoAxeViolations(page, 'a chart as a table');
    });

    await test.step('clickstream', async () => {
      await page.getByRole('link', { name: 'Clickstream', exact: true }).click();
      await expect(
        page.getByRole('table', { name: 'Sessions at each step of the demo journey' }),
      ).toBeVisible();
      await expectNoAxeViolations(page, 'clickstream');
    });

    await test.step('AI usage', async () => {
      await page.getByRole('link', { name: 'AI usage', exact: true }).click();
      await expect(
        page.getByRole('table', { name: 'Calls, tokens and cost by feature' }),
      ).toBeVisible();
      await expectNoSidewaysScroll(page);
      await expectNoAxeViolations(page, 'AI usage');
    });
  });
});

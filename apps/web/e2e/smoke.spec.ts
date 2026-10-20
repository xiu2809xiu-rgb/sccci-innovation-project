import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** WCAG 2.2 AA, as CLAUDE.md section 8 requires. */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Fails on every violation axe can find on the page as it stands. */
async function expectNoAxeViolations(page: Page, where: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} at ${violation.nodes.map((node) => node.html.slice(0, 160)).join(' | ')}`,
  );
  expect(summary, `axe violations on ${where}`).toEqual([]);
}

test('an HR user signs in, checks the employee master and approves an AI mapping', async ({
  page,
}) => {
  await test.step('sign in as the Singapore HR demo user', async () => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Sign in to HuiTong' })).toBeVisible();
    await expectNoAxeViolations(page, 'the sign-in page');
    await page.getByRole('button', { name: /HR, Singapore/ }).click();
    await expect(page).toHaveURL(/\/overview$/);
  });

  await test.step('see the overview', async () => {
    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible();
    await expect(page.getByText('Synthetic demo data').first()).toBeVisible();
    await expectNoAxeViolations(page, 'the overview');
  });

  await test.step('open a record in the employee master', async () => {
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Employees' })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: 'Employees' })).toBeVisible();
    const firstRecord = page.getByRole('button', { name: /\(opens the record\)$/ }).first();
    await expect(firstRecord).toBeVisible();
    await expectNoAxeViolations(page, 'the employee list');

    await firstRecord.click();
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByRole('table')).toBeVisible();
    await expectNoAxeViolations(page, 'the record drawer');
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });

  await test.step('approve an AI mapping for a new subsidiary system', async () => {
    await page.goto('/connectors/new-mapping');
    await expect(
      page.getByRole('heading', { level: 1, name: 'New mapping from a sample file' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Use the synthetic Malaysia sample' }).click();
    await expect(
      page.getByText('organisation-e-malaysia-hr-export.csv', { exact: false }),
    ).toBeVisible();
    await expectNoAxeViolations(page, 'the wizard upload step');
    await page.getByRole('button', { name: 'Get the AI proposal' }).click();

    await expect(page.getByRole('table', { name: /^Proposed mapping for / })).toBeVisible();
    await expect(page.getByText('Never mapped: national ID numbers').first()).toBeVisible();
    await expectNoAxeViolations(page, 'the wizard review step');
    await page.getByRole('button', { name: 'Continue to approval' }).click();

    // A fresh name each run: the journey creates a draft connector every time.
    const suffix = String(Date.now());
    await page.getByLabel('Name', { exact: true }).fill(`Organisation E Malaysia HR ${suffix}`);
    await page.getByLabel('Name in Chinese').fill(`马来西亚人力资源系统 ${suffix}`);
    await page
      .getByLabel(
        'I have reviewed every mapping. I understand that nothing is imported until a sync runs.',
      )
      .check();
    await expectNoAxeViolations(page, 'the wizard approval step');
    await page.getByRole('button', { name: 'Approve and save' }).click();

    await expect(page.getByText(/^Mapping version \d+ saved$/)).toBeVisible();
  });
});

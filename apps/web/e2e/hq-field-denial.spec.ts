import { expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './support/axe.ts';
import { DEMO_ROLES, signInAs } from './support/demo-session.ts';

/**
 * E2E #3 (docs/agile/hero-journey.md): HQ is refused a field its allowlist
 * does not hold. The seeded SG01 to HQ transfer shares identity, job, work
 * contact, grade and cost centre, but not dates of birth (story B-7).
 */
const SINGAPORE_EMPLOYEE = 'E100003';

test.describe('E2E #3: HQ is refused a field missing from its allowlist', () => {
  test('in the record drawer and through the raw API (areas 1 and 4, B-7)', async ({ page }) => {
    await test.step('sign in as HQ HR', async () => {
      await signInAs(page, DEMO_ROLES.hrChinaHq);
    });

    await test.step('the record drawer withholds the date of birth, and says why', async () => {
      await page.goto(`/employees?employee=${SINGAPORE_EMPLOYEE}`);
      const drawer = page.getByRole('dialog');
      const row = drawer.getByRole('row').filter({ hasText: 'Date of birth' });
      const hidden = row.getByRole('button', { name: /^Hidden\./ }).first();
      await expect(hidden).toBeVisible();
      await hidden.focus();
      await expect(page.getByRole('tooltip')).toContainText(
        'reaches your entity only under an approved cross-border transfer',
      );
      // The job grade is shared with HQ, so it shows: the allowlist, not the role, withholds the date.
      await expect(
        drawer
          .getByRole('row')
          .filter({ hasText: 'Job grade' })
          .getByRole('button', {
            name: /^Hidden\./,
          }),
      ).toHaveCount(0);
      await expectNoAxeViolations(page, 'the record drawer as HQ HR');
    });

    await test.step('the raw API withholds it too', async () => {
      const response = await page.request.get(`/api/v1/employees/${SINGAPORE_EMPLOYEE}`);
      expect(response.ok()).toBe(true);
      const body = (await response.json()) as {
        data: { fields: { field: string; value: unknown; sources: { value: unknown }[] }[] };
      };
      const dateOfBirth = body.data.fields.find((field) => field.field === 'dateOfBirth');
      expect(dateOfBirth?.value).toMatchObject({
        masked: true,
        reason: 'CROSS_BORDER_NOT_APPROVED',
      });
      expect(
        dateOfBirth?.sources.every((source) => (source.value as { masked?: boolean }).masked),
      ).toBe(true);
    });
  });

  test('in a report export, which leaves the field out (areas 3 and 4)', () => {
    test.fixme(true, 'D-4 builds the HQ report export on FieldMasker.withheld (story B-7)');
  });

  test('with each refusal listed in the audit-log viewer (area 4)', () => {
    test.fixme(
      true,
      'F-2 builds the audit-log viewer; the API already writes access.fields_withheld',
    );
  });
});

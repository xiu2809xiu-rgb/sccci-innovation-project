import { expect, test } from '@playwright/test';

import { expectNoAxeViolations } from './support/axe.ts';
import { DEMO_ROLES, signInAs } from './support/demo-session.ts';
import { expectNoSidewaysScroll } from './support/layout.ts';

/**
 * The integration map (area 1, story A-6) through the real stack: the scene
 * draws, and the list beside it names every system with its state and opens
 * its connector, in both languages. Playwright runs with reduced motion, so
 * the scene is its still frame; the last test turns motion on to pause it.
 */
test.describe('Integration map (area 1)', () => {
  test('the scene and every system beside it, as HR Singapore', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    await signInAs(page, DEMO_ROLES.hrSingapore);
    await page.goto('/integration-map');
    await expect(page.getByRole('heading', { level: 1, name: 'Integration map' })).toBeVisible();

    await test.step('every system by region, with its state in words', async () => {
      const singapore = page.getByRole('region', { name: 'Singapore' });
      await expect(singapore.getByRole('link', { name: /^Singapore HR/ })).toBeVisible();
      await expect(
        singapore.getByRole('listitem').filter({ hasText: 'Legacy Excel employee master' }),
      ).toContainText('Being retired');
      await expect(
        page.getByRole('region', { name: 'China HQ' }).getByRole('link', { name: /^China HQ SAP/ }),
      ).toBeVisible();
    });

    await test.step('the scene, as a still frame under reduced motion', async () => {
      await expect(page.locator('canvas')).toBeVisible();
      await expect(
        page.getByText('A still frame: your system asks for reduced motion.'),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Pause motion' })).toHaveCount(0);
    });

    await test.step('fits at 1024 px and passes axe', async () => {
      await page.setViewportSize({ width: 1024, height: 768 });
      await expectNoSidewaysScroll(page);
      await page.setViewportSize({ width: 1280, height: 720 });
      await expectNoAxeViolations(page, 'the integration map');
    });

    await test.step('in Chinese', async () => {
      await page.getByRole('button', { name: /^EN/ }).click();
      await page.getByRole('menuitemradio', { name: '简体中文' }).click();
      await expect(page.getByRole('heading', { level: 1, name: '集成地图' })).toBeVisible();
      await expect(page.getByRole('region', { name: '中国总部' })).toBeVisible();
      await expectNoAxeViolations(page, 'the integration map in Chinese');
    });

    await test.step('a system opens its connector', async () => {
      await page
        .getByRole('region', { name: '新加坡' })
        .getByRole('link', { name: /^新加坡人力资源系统/ })
        .click();
      await expect(page).toHaveURL(/\/connectors\/sg-hr$/);
    });

    expect(errors).toEqual([]);
  });

  test.describe('with motion', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('the scene moves until it is paused', async ({ page }) => {
      await signInAs(page, DEMO_ROLES.hrSingapore);
      await page.goto('/integration-map');
      await expect(page.locator('canvas')).toBeVisible();
      await page.getByRole('button', { name: 'Pause motion' }).click();
      await expect(page.getByRole('button', { name: 'Play motion' })).toBeVisible();
      await expectNoAxeViolations(page, 'the integration map, paused');
    });
  });
});

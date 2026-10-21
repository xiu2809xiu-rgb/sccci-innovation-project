import { expect, type Page } from '@playwright/test';

/** The demo sign-in buttons, by the role label each shows. */
export const DEMO_ROLES = {
  hrSingapore: /HR, Singapore/,
  hrChinaHq: /HR, China HQ/,
  adminOps: /Admin operations/,
} as const;

/** Signs in with a demo account (demo mode, synthetic data) and waits for the overview. */
export async function signInAs(page: Page, role: RegExp): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in to HuiTong' })).toBeVisible();
  await page.getByRole('button', { name: role }).click();
  await expect(page).toHaveURL(/\/overview$/);
}

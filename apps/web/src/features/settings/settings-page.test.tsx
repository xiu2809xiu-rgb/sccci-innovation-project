import { DEFAULT_ROLE_PERMISSIONS } from '@huitong/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { usePreferences } from '@/app/preferences/preferences-store';
import { renderApp, sessionFor } from '@/test/render-app';

const routes = {
  'GET /auth/me': { body: { data: sessionFor('HR_SG', [...DEFAULT_ROLE_PERMISSIONS.HR_SG]) } },
};

describe('SettingsPage', () => {
  it('shows who is signed in', async () => {
    renderApp('/settings', routes);
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('meiling.tan@orge.example')).toBeInTheDocument();
    expect(screen.getByText('HR, Singapore')).toBeInTheDocument();
  });

  it('switches the interface to Chinese at once', async () => {
    const user = userEvent.setup();
    renderApp('/settings', routes);
    await user.click(await screen.findByRole('radio', { name: '简体中文' }));
    expect(await screen.findByRole('heading', { level: 1, name: '设置' })).toBeInTheDocument();
    expect(usePreferences.getState().language).toBe('zh-CN');
  });

  it('records analytics consent only when the person opts in', async () => {
    const user = userEvent.setup();
    usePreferences.setState({ analyticsConsent: false });
    renderApp('/settings', routes);
    const consent = await screen.findByRole('switch', { name: 'Share anonymous usage analytics' });
    expect(consent).toHaveAttribute('aria-checked', 'false');
    await user.click(consent);
    expect(usePreferences.getState().analyticsConsent).toBe(true);
    expect(await screen.findByText('Privacy preference saved')).toBeInTheDocument();
  });
});

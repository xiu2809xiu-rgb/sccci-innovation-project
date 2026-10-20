import { DEFAULT_ROLE_PERMISSIONS } from '@huitong/shared';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderApp, sessionFor } from '@/test/render-app';

const unauthenticated = {
  'GET /auth/me': {
    status: 401,
    body: { error: { code: 'UNAUTHENTICATED', message: 'no session', traceId: 't' } },
  },
  'POST /auth/refresh': {
    status: 401,
    body: { error: { code: 'SESSION_EXPIRED', message: 'no session', traceId: 't' } },
  },
};

function signedInAs(role: keyof typeof DEFAULT_ROLE_PERMISSIONS) {
  return {
    'GET /auth/me': { body: { data: sessionFor(role, [...DEFAULT_ROLE_PERMISSIONS[role]]) } },
  };
}

describe('routing and access', () => {
  it('sends an anonymous visitor to sign-in before showing any page', async () => {
    renderApp('/employees', unauthenticated);
    expect(await screen.findByRole('heading', { name: 'Sign in to HuiTong' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  });

  it('lands a signed-in user on the overview inside the app shell', async () => {
    renderApp('/', signedInAs('HR_SG'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main',
    );
  });

  it('shows only the navigation the role is allowed to use', async () => {
    renderApp('/overview', signedInAs('HIRING_MANAGER'));
    await screen.findByRole('heading', { level: 1, name: 'Overview' });
    const sidebar = screen.getAllByRole('link').map((link) => link.textContent);
    expect(sidebar).toContain('Workflows');
    expect(sidebar).not.toContain('Governance');
    expect(sidebar).not.toContain('Audit log');
  });

  it('replaces a page the role may not open with the permission-denied state', async () => {
    renderApp('/governance', signedInAs('HIRING_MANAGER'));
    const main = await screen.findByRole('main');
    expect(
      await within(main).findByText('You do not have access to this page'),
    ).toBeInTheDocument();
  });

  it('shows the not-found state for unknown URLs inside the app', async () => {
    renderApp('/no-such-page', signedInAs('AUDITOR'));
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });

  it('skips sign-in for someone who already has a session', async () => {
    renderApp('/login?next=%2Fsettings', signedInAs('HR_HQ'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
  });
});

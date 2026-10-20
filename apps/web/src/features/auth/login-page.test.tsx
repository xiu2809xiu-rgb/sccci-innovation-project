import { DEFAULT_ROLE_PERMISSIONS } from '@huitong/shared';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderApp, sessionFor, type FakeRoutes } from '@/test/render-app';

const anonymous: FakeRoutes = {
  'GET /auth/me': {
    status: 401,
    body: { error: { code: 'UNAUTHENTICATED', message: 'no session', traceId: 't' } },
  },
  'POST /auth/refresh': {
    status: 401,
    body: { error: { code: 'SESSION_EXPIRED', message: 'no session', traceId: 't' } },
  },
};

function withDemoMode(demoMode: boolean, extra: FakeRoutes = {}): FakeRoutes {
  return { ...anonymous, 'GET /auth/options': { body: { data: { demoMode } } }, ...extra };
}

describe('LoginPage', () => {
  it('explains the product and offers sign-in', async () => {
    renderApp('/login', withDemoMode(false));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Approved HR data, flowing between Singapore and China HQ.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in to HuiTong' })).toBeInTheDocument();
    expect(screen.getByText('The integration map')).toBeInTheDocument();
  });

  it('offers demo roles only when the server runs in demo mode', async () => {
    const { unmount } = renderApp('/login', withDemoMode(true));
    expect(await screen.findByRole('button', { name: /HR, Singapore/ })).toBeInTheDocument();
    unmount();
    renderApp('/login', withDemoMode(false));
    await screen.findByRole('heading', { name: 'Sign in to HuiTong' });
    expect(screen.queryByRole('button', { name: /HR, Singapore/ })).not.toBeInTheDocument();
  });

  it('validates the form before calling the server', async () => {
    const user = userEvent.setup();
    renderApp('/login', withDemoMode(false));
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter a valid work email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
  });

  it('explains a failed sign-in without saying which part was wrong', async () => {
    const user = userEvent.setup();
    renderApp(
      '/login',
      withDemoMode(false, {
        'POST /auth/login': {
          status: 401,
          body: { error: { code: 'INVALID_CREDENTIALS', message: 'no', traceId: 't' } },
        },
      }),
    );
    await user.type(await screen.findByLabelText('Work email'), 'meiling.tan@orge.example');
    await user.type(screen.getByLabelText('Password'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That email and password do not match.',
    );
  });

  it('goes to the requested page after signing in', async () => {
    const user = userEvent.setup();
    renderApp(
      '/login?next=%2Fsettings',
      withDemoMode(false, {
        'POST /auth/login': {
          body: { data: sessionFor('HR_SG', [...DEFAULT_ROLE_PERMISSIONS.HR_SG]) },
        },
      }),
    );
    await user.type(await screen.findByLabelText('Work email'), 'meiling.tan@orge.example');
    await user.type(screen.getByLabelText('Password'), 'HuiTong!Demo2026');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
  });
});

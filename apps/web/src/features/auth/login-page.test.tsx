import { DEFAULT_ROLE_PERMISSIONS } from '@huitong/shared';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { renderApp, sessionFor, type FakeRoutes } from '@/test/render-app';

const teaser = vi.hoisted(() => ({ requested: false }));
// The 3D teaser's chunk fails to load, as after a redeploy that removed old files. Only the test
// that pretends WebGL exists ever asks for it; jsdom has no WebGL, so the others draw the fallback.
vi.mock('./components/integration-teaser-scene', () => {
  teaser.requested = true;
  throw new Error('Failed to fetch dynamically imported module');
});

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
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('offers sign-in first and explains the product beside it', async () => {
    renderApp('/login', withDemoMode(false));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in to HuiTong' }),
    ).toBeInTheDocument();
    const story = screen.getByRole('complementary');
    expect(
      within(story).getByRole('heading', {
        level: 2,
        name: 'Approved HR data, flowing between Singapore and China HQ.',
      }),
    ).toBeInTheDocument();
    expect(within(story).getByText('The integration map')).toBeInTheDocument();
    expect(within(story).getByText('Append-only audit trail')).toBeInTheDocument();
  });

  it('keeps sign-in working when the 3D teaser cannot load', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) =>
      kind === 'webgl2'
        ? ({ getExtension: () => null } as unknown as RenderingContext)
        : null) as HTMLCanvasElement['getContext']);
    renderApp('/login', withDemoMode(false));
    await screen.findByRole('heading', { level: 1, name: 'Sign in to HuiTong' });
    await waitFor(() => {
      expect(teaser.requested).toBe(true);
    });
    // Let React retry the teaser once its import has settled; an unhandled failure surfaces here.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(
      screen.getByRole('heading', { level: 1, name: 'Sign in to HuiTong' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Work email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
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

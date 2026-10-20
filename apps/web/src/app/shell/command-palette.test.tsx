import { DEFAULT_ROLE_PERMISSIONS } from '@huitong/shared';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderApp, sessionFor } from '@/test/render-app';

const routes = {
  'GET /auth/me': {
    body: { data: sessionFor('HIRING_MANAGER', [...DEFAULT_ROLE_PERMISSIONS.HIRING_MANAGER]) },
  },
};

describe('CommandPalette', () => {
  it('opens with Ctrl+K and jumps to a page', async () => {
    const user = userEvent.setup();
    renderApp('/overview', routes);
    await screen.findByRole('heading', { level: 1, name: 'Overview' });

    await user.keyboard('{Control>}k{/Control}');
    const palette = await screen.findByRole('dialog', { name: 'Command palette' });
    await user.type(within(palette).getByRole('combobox'), 'settings');
    await user.click(within(palette).getByRole('option', { name: 'Settings' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
  });

  it('offers only the pages the role may open', async () => {
    const user = userEvent.setup();
    renderApp('/overview', routes);
    await screen.findByRole('heading', { level: 1, name: 'Overview' });
    await user.keyboard('{Control>}k{/Control}');
    const palette = await screen.findByRole('dialog', { name: 'Command palette' });
    expect(within(palette).getByRole('option', { name: 'Workflows' })).toBeInTheDocument();
    expect(within(palette).queryByRole('option', { name: 'Audit log' })).not.toBeInTheDocument();
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createI18n } from '@/i18n/create-i18n';

import { IntegrationTeaser } from './integration-teaser';

// The 3D scene fails the way a blocked GPU does: three.js throws while creating its WebGL context.
vi.mock('./integration-teaser-scene', () => ({
  IntegrationTeaserScene: () => {
    throw new Error('Error creating WebGL context.');
  },
}));

describe('IntegrationTeaser', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) =>
      kind === 'webgl2'
        ? ({ getExtension: () => null } as unknown as RenderingContext)
        : null) as HTMLCanvasElement['getContext']);
  });

  it('catches a failing 3D scene and keeps the static drawing and its description', async () => {
    const caught: unknown[] = [];
    const { container } = render(
      <I18nextProvider i18n={createI18n('en')}>
        <IntegrationTeaser className="size-64" />
      </I18nextProvider>,
      {
        onCaughtError: (error) => {
          caught.push(error);
        },
      },
    );
    // Caught by the teaser's own boundary, not left to take the page down.
    await waitFor(() => {
      expect(caught.length).toBeGreaterThan(0);
    });
    for (const error of caught) {
      expect(error).toHaveProperty('message', 'Error creating WebGL context.');
    }
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(
      screen.getByText(/A central hub linking Singapore HR, China HQ SAP, OA approvals/),
    ).toBeInTheDocument();
  });
});

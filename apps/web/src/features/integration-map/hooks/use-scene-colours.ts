import { useMemo } from 'react';

import { useTokenColor } from '@/hooks/use-token-color';
import { cssColorToHex } from '@/lib/css-color';

import type { SceneColours } from '../components/scene/scene-types';
import { NODE_STATE_STYLE } from '../node-state-style';

/**
 * The scene's colours from the design tokens, re-read when the theme changes.
 * Each state's colour comes from {@link NODE_STATE_STYLE}, the same table the
 * legend and the list read, so the scene and its legend cannot drift apart.
 */
export function useSceneColours(): SceneColours {
  const primary = useTokenColor('--primary');
  const pod = useTokenColor('--scene-pod');
  const platform = useTokenColor('--border');
  const connected = useTokenColor(NODE_STATE_STYLE.connected.token);
  const syncing = useTokenColor(NODE_STATE_STYLE.syncing.token);
  const degraded = useTokenColor(NODE_STATE_STYLE.degraded.token);
  const error = useTokenColor(NODE_STATE_STYLE.error.token);
  const idle = useTokenColor(NODE_STATE_STYLE.idle.token);
  const retiring = useTokenColor(NODE_STATE_STYLE.retiring.token);

  return useMemo(
    () => ({
      core: cssColorToHex(primary),
      coreLight: cssColorToHex(primary),
      shell: cssColorToHex(pod),
      platform: cssColorToHex(platform),
      rim: cssColorToHex(primary),
      states: {
        connected: cssColorToHex(connected),
        syncing: cssColorToHex(syncing),
        degraded: cssColorToHex(degraded),
        error: cssColorToHex(error),
        idle: cssColorToHex(idle),
        retiring: cssColorToHex(retiring),
      },
    }),
    [primary, pod, platform, connected, syncing, degraded, error, idle, retiring],
  );
}

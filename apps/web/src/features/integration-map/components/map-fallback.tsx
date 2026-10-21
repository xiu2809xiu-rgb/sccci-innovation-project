import { useTranslation } from 'react-i18next';

import fallbackUrl from '@/assets/3d/integration-map-fallback.webp';

/**
 * The still rendered from the same models in Blender (assets-src/3d), shown
 * when the browser cannot draw 3D. It fills the stage as the scene would; the
 * caption says why it is a still, and the list beside it has the live states.
 */
export function MapFallback() {
  const { t } = useTranslation('integrationMap');
  return (
    <figure className="relative size-full">
      <img
        src={fallbackUrl}
        alt={t('scene.fallback')}
        width={1280}
        height={720}
        className="size-full object-contain"
      />
      <figcaption className="absolute start-3 top-3 max-w-[calc(100%-1.5rem)] rounded-md border border-glass-border bg-glass px-2 py-1 text-xs text-foreground backdrop-blur-md">
        {t('scene.fallbackNote')}
      </figcaption>
    </figure>
  );
}

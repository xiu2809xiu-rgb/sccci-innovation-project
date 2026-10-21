import { useTranslation } from 'react-i18next';

import { LatticeLoader } from '@/components/reactbits/lattice-loader';

/** The stage while the 3D scene's chunk loads: a quiet lattice and what it is waiting for. */
export function SceneLoading() {
  const { t } = useTranslation('integrationMap');
  const label = t('scene.loading');
  return (
    <div className="grid size-full place-items-center">
      <LatticeLoader
        status="working"
        label={label}
        doneLabel={label}
        errorLabel={label}
        pattern="orbit"
        cellSize={6}
        gap={2}
        className="text-xs text-muted-foreground"
      />
    </div>
  );
}

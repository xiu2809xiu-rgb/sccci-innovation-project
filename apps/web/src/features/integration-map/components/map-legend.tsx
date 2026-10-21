import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import { NODE_STATES } from '../map-model';
import { NODE_STATE_STYLE } from '../node-state-style';

/**
 * What the node colours mean, on a glass panel over the scene (the one place
 * glass is allowed). Each state has its icon and word, so colour is never the
 * only cue. A note about the scene itself (a still frame) goes at the foot, so
 * it never covers the scene's labels.
 */
export function MapLegend({ note }: { note?: string | undefined }) {
  const { t } = useTranslation('integrationMap');
  return (
    <div className="rounded-lg border border-glass-border bg-glass px-3 py-2 shadow-sm backdrop-blur-md">
      <p className="mb-1 text-xs font-semibold text-foreground">{t('legend.label')}</p>
      <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {NODE_STATES.map((state) => {
          const { icon: Icon, text } = NODE_STATE_STYLE[state];
          return (
            <li key={state} className="flex items-center gap-1.5 text-xs text-foreground">
              <Icon aria-hidden="true" className={cn('size-3.5', text)} />
              {t(`state.${state}`)}
            </li>
          );
        })}
      </ul>
      {note ? (
        <p className="mt-1.5 border-t border-glass-border pt-1.5 text-xs text-muted-foreground">
          {note}
        </p>
      ) : null}
    </div>
  );
}

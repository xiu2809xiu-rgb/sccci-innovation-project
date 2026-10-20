import type { MappingConfig } from '@huitong/shared';
import { useTranslation } from 'react-i18next';

import { RelativeTime } from '@/components/common/relative-time';
import { SectionCard } from '@/components/common/section-card';
import { StatusBadge } from '@/components/common/status-badge';
import { useEmployeeLabels } from '@/features/employees/hooks/use-employee-labels';

import { useTransformLabel } from '../hooks/use-transform-label';

const STATUS_TONE = { ACTIVE: 'success', ARCHIVED: 'neutral', DRAFT: 'info' } as const;

/** Every mapping version of a connector, newest first; each opens to its field-by-field mapping. */
export function MappingVersions({ configs }: { configs: MappingConfig[] }) {
  const { t } = useTranslation('connectors');
  const labels = useEmployeeLabels();
  const describe = useTransformLabel();
  const ordered = [...configs].sort((a, b) => b.version - a.version);

  return (
    <SectionCard title={t('detail.mappings.title')} description={t('detail.mappings.description')}>
      {ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('detail.mappings.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {ordered.map((config) => (
            <li key={config.id} className="rounded-lg border border-border">
              <details open={config.status === 'ACTIVE' && ordered.length === 1}>
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 rounded-lg px-4 py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    {t('card.mappingVersion', { version: config.version })}
                    <StatusBadge tone={STATUS_TONE[config.status]}>
                      {t(`detail.mappings.status.${config.status}`)}
                    </StatusBadge>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {config.approvedBy
                      ? t('detail.mappings.approvedBy', { name: config.approvedBy.displayName })
                      : null}
                    {config.approvedAt ? (
                      <>
                        {' · '}
                        <RelativeTime value={config.approvedAt} />
                      </>
                    ) : null}
                  </span>
                </summary>
                <div className="space-y-2 border-t border-border px-4 py-3">
                  {config.notes ? (
                    <p className="text-sm text-muted-foreground">{config.notes}</p>
                  ) : null}
                  <table className="w-full text-sm">
                    <caption className="sr-only">
                      {t('detail.mappings.caption', { version: config.version })}
                    </caption>
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr>
                        <th scope="col" className="py-1 pr-3 font-medium">
                          {t('detail.mappings.target')}
                        </th>
                        <th scope="col" className="py-1 pr-3 font-medium">
                          {t('detail.mappings.source')}
                        </th>
                        <th scope="col" className="py-1 font-medium">
                          {t('detail.mappings.transform')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {config.mappings.map((mapping) => (
                        <tr key={mapping.target} className="border-t border-border">
                          <td className="py-1.5 pr-3 text-foreground">
                            {labels.field(mapping.target)}
                          </td>
                          <td className="py-1.5 pr-3 font-mono text-xs">
                            {mapping.source ?? t('detail.mappings.noSource')}
                          </td>
                          <td className="py-1.5 text-muted-foreground">
                            {describe(mapping.transform)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

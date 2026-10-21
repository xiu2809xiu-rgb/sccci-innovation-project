import type { LeaveCategoryMapping } from '@huitong/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { PageHeader } from '@/components/common/page-header';
import { SyntheticDataBadge } from '@/components/common/synthetic-data-badge';
import { FadeContent } from '@/components/reactbits/fade-content';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useHasPermission } from '@/app/session/use-session';

import { useLeaveRules } from '../api/attendance-queries';
import { AreaNav } from '../components/area-nav';
import { ChangeRuleDialog } from '../components/change-rule-dialog';
import { RulesTable } from '../components/rules-table';
import { useConnectorName } from '../hooks/use-connector-name';

const PAGE_SIZE = 50;
const ALL = 'all';
const SYSTEMS = ['sg-hr', 'cn-hq'] as const;

/** The approved leave-category rules, read from the database, and a way to propose a change. */
export function CategoryRulesPage() {
  const { t } = useTranslation('attendanceLeave');
  const [params, setParams] = useSearchParams();
  const connectorName = useConnectorName();
  const system = SYSTEMS.find((candidate) => candidate === params.get('system'));
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const rules = useLeaveRules(system, page, PAGE_SIZE);
  const canManage = useHasPermission('leave-mappings:manage');
  const [changing, setChanging] = useState<LeaveCategoryMapping | null>(null);

  const update = (key: 'system' | 'page', value: string | null) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === null) next.delete(key);
        else next.set(key, value);
        if (key === 'system') next.delete('page');
        return next;
      },
      { replace: true },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('rules.title')}
        description={t('rules.description')}
        meta={<SyntheticDataBadge />}
      />
      <AreaNav />
      <ToggleGroup
        type="single"
        variant="outline"
        value={system ?? ALL}
        aria-label={t('rules.filter.label')}
        onValueChange={(value) => {
          if (value) update('system', value === ALL ? null : value);
        }}
      >
        <ToggleGroupItem value={ALL}>{t('rules.filter.all')}</ToggleGroupItem>
        {SYSTEMS.map((id) => (
          <ToggleGroupItem key={id} value={id}>
            {connectorName(id)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <FadeContent trigger="mount">
        <RulesTable
          query={rules}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={(next) => {
            update('page', String(next));
          }}
          onChange={canManage ? setChanging : undefined}
        />
      </FadeContent>
      {changing ? (
        <ChangeRuleDialog
          rule={changing}
          onClose={() => {
            setChanging(null);
          }}
        />
      ) : null}
    </div>
  );
}

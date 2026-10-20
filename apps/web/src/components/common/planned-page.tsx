import { Construction } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { FadeContent } from '@/components/reactbits/fade-content';

import { EmptyState } from './empty-state';
import { PageHeader } from './page-header';

/**
 * Temporary page for routes whose feature lands in a later phase of the
 * platform-base build. Each one is replaced by the real page in that phase.
 */
export function PlannedPage({ title, description }: { title: string; description: string }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />
      <FadeContent trigger="mount">
        <EmptyState
          icon={Construction}
          title={t('states.planned.title')}
          description={t('states.planned.description')}
        />
      </FadeContent>
    </div>
  );
}

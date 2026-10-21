import { useMatch } from 'react-router';

import { AccessPage } from './pages/access-page';
import { AuditLogPage } from './pages/audit-log-page';
import { ClassificationPage } from './pages/classification-page';
import { RetentionPage } from './pages/retention-page';
import { TransfersPage } from './pages/transfers-page';

/**
 * Governance (area 4): the access policy, the classification, transfer and
 * retention registers, and the audit log. One lazy route module serves every
 * path. All of it is real data, read only until area 4 builds administration.
 */
export function GovernancePage() {
  const classification = useMatch('/governance/classification');
  const transfers = useMatch('/governance/transfers');
  const retention = useMatch('/governance/retention');
  const audit = useMatch('/governance/audit');
  if (classification) return <ClassificationPage />;
  if (transfers) return <TransfersPage />;
  if (retention) return <RetentionPage />;
  if (audit) return <AuditLogPage />;
  return <AccessPage />;
}

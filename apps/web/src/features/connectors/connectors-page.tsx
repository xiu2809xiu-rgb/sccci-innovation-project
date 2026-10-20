import { useMatch, useParams } from 'react-router';

import { ConnectorDetailPage } from './pages/connector-detail-page';
import { ConnectorListPage } from './pages/connector-list-page';
import { MappingWizardPage } from './pages/mapping-wizard-page';

/**
 * Connectors (area 1): the list, one connector, and the AI mapping wizard.
 * One lazy route module serves all three paths, so they share one chunk.
 */
export function ConnectorsPage() {
  const wizard = useMatch('/connectors/new-mapping');
  const { connectorId } = useParams();
  if (wizard) return <MappingWizardPage />;
  if (connectorId) return <ConnectorDetailPage connectorId={connectorId} />;
  return <ConnectorListPage />;
}

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const KNOWN_CONNECTORS = ['sg-hr', 'cn-hq'] as const;

/** A source system's short name in the reader's language; an unknown id is shown as it is. */
export function useConnectorName(): (connectorId: string) => string {
  const { t } = useTranslation('attendanceLeave');
  return useCallback(
    (connectorId: string) => {
      const known = KNOWN_CONNECTORS.find((candidate) => candidate === connectorId);
      return known ? t(`connector.${known}`) : connectorId;
    },
    [t],
  );
}

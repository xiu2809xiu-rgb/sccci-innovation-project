import { ENTITY_CODES, resolveClearance, type AccessMatrix } from '@huitong/shared';
import { useTranslation } from 'react-i18next';

import { ClassificationBadge } from '@/components/common/classification-badge';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { clearanceRulesOf } from '../access-matrix';

/**
 * The highest level each role may see on a record of each entity, resolved
 * the way the masking interceptor resolves it: an entity's own rule first,
 * then the role's rule for every other entity.
 */
export function ClearanceTable({ matrix }: { matrix: AccessMatrix }) {
  const { t } = useTranslation('governance');
  const { t: tCommon } = useTranslation();
  const rules = clearanceRulesOf(matrix);

  return (
    <Table>
      <TableCaption className="sr-only">{t('access.clearanceCaption')}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{t('access.role')}</TableHead>
          {ENTITY_CODES.map((entity) => (
            <TableHead key={entity} scope="col">
              {tCommon(`entities.${entity}`)}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {matrix.roles.map((row) => (
          <TableRow key={row.role}>
            <TableHead scope="row" className="font-normal">
              {tCommon(`roles.${row.role}`)}
            </TableHead>
            {ENTITY_CODES.map((entity) => (
              <TableCell key={entity}>
                <ClassificationBadge level={resolveClearance(rules, row.role, entity)} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

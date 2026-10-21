import type { AccessMatrix } from '@huitong/shared';
import { Check, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { permissionKey, PERMISSION_GROUPS } from '../permission-groups';

/**
 * Every permission against every role, grouped by what it governs. A check
 * where the role holds it; the words are there for screen readers, so the
 * marks never carry the meaning alone.
 */
export function PermissionMatrix({ matrix }: { matrix: AccessMatrix }) {
  const { t } = useTranslation('governance');
  const { t: tCommon } = useTranslation();
  const held = new Map(matrix.roles.map((row) => [row.role, new Set(row.permissions)]));

  return (
    <div className="rounded-lg border border-border">
      <table className="w-full text-sm">
        <caption className="sr-only">{t('access.permissionsCaption')}</caption>
        <thead>
          <tr className="bg-muted/50">
            <th scope="col" className="px-3 py-2 text-left font-medium text-foreground">
              {t('access.permission')}
            </th>
            {matrix.roles.map((row) => (
              <th
                key={row.role}
                scope="col"
                className="w-20 px-1 py-2 text-center text-xs leading-tight font-medium text-foreground"
              >
                {tCommon(`roles.${row.role}`)}
              </th>
            ))}
          </tr>
        </thead>
        {PERMISSION_GROUPS.map((group) => {
          const rows = group.permissions.filter((permission) =>
            matrix.permissions.includes(permission),
          );
          if (rows.length === 0) return null;
          return (
            <tbody key={group.key}>
              <tr className="border-t border-border">
                <th
                  scope="rowgroup"
                  colSpan={matrix.roles.length + 1}
                  className="bg-muted/30 px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground"
                >
                  {t(`permissionGroups.${group.key}`)}
                </th>
              </tr>
              {rows.map((permission) => (
                <tr key={permission} className="border-t border-border">
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <span className="block text-foreground">{t(permissionKey(permission))}</span>
                    <code className="font-mono text-xs text-muted-foreground">{permission}</code>
                  </th>
                  {matrix.roles.map((row) => {
                    const allowed = held.get(row.role)?.has(permission) === true;
                    return (
                      <td key={row.role} className="px-1 py-2 text-center">
                        {allowed ? (
                          <Check className="mx-auto size-4 text-success" aria-hidden="true" />
                        ) : (
                          <Minus
                            className="mx-auto size-4 text-subtle-foreground"
                            aria-hidden="true"
                          />
                        )}
                        <span className="sr-only">
                          {allowed ? t('access.allowed') : t('access.notAllowed')}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}

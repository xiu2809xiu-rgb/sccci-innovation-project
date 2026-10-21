import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  AUDIT_ACTION_FAMILIES,
  AUDIT_ENTITY_TYPES,
  isAuditActionFamily,
  isAuditEntityType,
  type AuditFilterValues,
} from '../audit-filter-params';

const ALL = 'all';

/**
 * One row of filters above the log. Nothing is fetched until they are
 * applied, so typing a record ID does not send a request per keystroke.
 * Remount it (a `key`) to load new values from the URL.
 */
export function AuditFilters({
  values,
  onApply,
}: {
  values: AuditFilterValues;
  onApply: (values: AuditFilterValues) => void;
}) {
  const { t } = useTranslation('governance');
  const id = useId();
  const [draft, setDraft] = useState(values);
  const reversed = draft.from !== '' && draft.to !== '' && draft.to < draft.from;
  const typeLabel = (type: string) =>
    isAuditEntityType(type) ? t(`audit.entityType.${type}`) : type;
  const types =
    values.entityType && !isAuditEntityType(values.entityType)
      ? [...AUDIT_ENTITY_TYPES, values.entityType]
      : AUDIT_ENTITY_TYPES;

  const set =
    <K extends keyof AuditFilterValues>(key: K) =>
    (value: AuditFilterValues[K]) => {
      setDraft((current) => ({ ...current, [key]: value }));
    };

  return (
    <form
      aria-label={t('audit.filters.label')}
      onSubmit={(event) => {
        event.preventDefault();
        if (!reversed) onApply({ ...draft, entityId: draft.entityId.trim() });
      }}
      noValidate
      className="flex flex-wrap items-end gap-3"
    >
      <Field className="w-44">
        <FieldLabel htmlFor={`${id}-type`}>{t('audit.filters.entityType')}</FieldLabel>
        <Select
          value={draft.entityType || ALL}
          onValueChange={(value) => {
            set('entityType')(value === ALL ? '' : value);
          }}
        >
          <SelectTrigger id={`${id}-type`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('audit.filters.allTypes')}</SelectItem>
            {types.map((type) => (
              <SelectItem key={type} value={type}>
                {typeLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field className="w-44">
        <FieldLabel htmlFor={`${id}-record`}>{t('audit.filters.entityId')}</FieldLabel>
        <Input
          id={`${id}-record`}
          value={draft.entityId}
          placeholder={t('audit.filters.entityIdPlaceholder')}
          maxLength={64}
          onChange={(event) => {
            set('entityId')(event.target.value);
          }}
        />
      </Field>
      <Field className="w-48">
        <FieldLabel htmlFor={`${id}-action`}>{t('audit.filters.action')}</FieldLabel>
        <Select
          value={draft.action || ALL}
          onValueChange={(value) => {
            set('action')(isAuditActionFamily(value) ? value : '');
          }}
        >
          <SelectTrigger id={`${id}-action`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('audit.filters.allActions')}</SelectItem>
            {AUDIT_ACTION_FAMILIES.map((family) => (
              <SelectItem key={family} value={family}>
                {t(`audit.actionFamily.${family}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field className="w-40">
        <FieldLabel htmlFor={`${id}-from`}>{t('audit.filters.from')}</FieldLabel>
        <Input
          id={`${id}-from`}
          type="date"
          value={draft.from}
          onChange={(event) => {
            set('from')(event.target.value);
          }}
        />
      </Field>
      <Field className="w-40" data-invalid={reversed}>
        <FieldLabel htmlFor={`${id}-to`}>{t('audit.filters.to')}</FieldLabel>
        <Input
          id={`${id}-to`}
          type="date"
          value={draft.to}
          aria-invalid={reversed}
          aria-describedby={reversed ? `${id}-to-error` : undefined}
          onChange={(event) => {
            set('to')(event.target.value);
          }}
        />
      </Field>
      <Button type="submit" variant="outline" disabled={reversed}>
        {t('audit.filters.apply')}
      </Button>
      {reversed ? (
        <FieldError id={`${id}-to-error`} className="basis-full">
          {t('audit.filters.toBeforeFrom')}
        </FieldError>
      ) : null}
    </form>
  );
}

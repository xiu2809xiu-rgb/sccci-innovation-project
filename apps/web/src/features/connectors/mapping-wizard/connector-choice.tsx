import { ENTITY_CODES, entityCodeSchema, type MappingProposal } from '@huitong/shared';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEmployeeLabels } from '@/features/employees/hooks/use-employee-labels';

import { useConnectors } from '../api/connector-queries';
import type { ConnectorDraft } from './connector-draft';

export interface ConnectorChoiceProps {
  proposal: MappingProposal;
  value: ConnectorDraft;
  onChange: (next: ConnectorDraft) => void;
}

/** A new file-import connector for the system, or the next mapping version of an existing one. */
export function ConnectorChoice({ proposal, value, onChange }: ConnectorChoiceProps) {
  const { t, i18n } = useTranslation('connectors');
  const labels = useEmployeeLabels();
  const ids = { new: useId(), existing: useId(), name: useId(), nameZh: useId(), entity: useId() };
  const connectors = useConnectors();
  const fileConnectors = (connectors.data ?? []).filter(
    (connector) => connector.type === 'FILE_IMPORT' || connector.id === proposal.connectorId,
  );
  const set = (patch: Partial<ConnectorDraft>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <RadioGroup
      value={value.target}
      onValueChange={(next) => {
        set({ target: next === 'existing' ? 'existing' : 'new' });
      }}
      aria-label={t('wizard.approve.connector')}
      className="gap-3"
    >
      <div className="space-y-3 rounded-md border border-border p-3 has-data-checked:border-primary">
        <div className="flex items-center gap-3">
          <RadioGroupItem id={ids.new} value="new" />
          <Label htmlFor={ids.new} className="font-medium">
            {t('wizard.approve.newConnector')}
          </Label>
        </div>
        {value.target === 'new' ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor={ids.name}>{t('wizard.approve.name')}</Label>
              <Input
                id={ids.name}
                value={value.name}
                onChange={(event) => {
                  set({ name: event.target.value });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.nameZh}>{t('wizard.approve.nameZh')}</Label>
              <Input
                id={ids.nameZh}
                lang="zh-CN"
                value={value.nameZh}
                onChange={(event) => {
                  set({ nameZh: event.target.value });
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={ids.entity}>{t('wizard.upload.entity')}</Label>
              <Select
                value={value.entity}
                onValueChange={(next) => {
                  const entity = entityCodeSchema.safeParse(next);
                  if (entity.success) set({ entity: entity.data });
                }}
              >
                <SelectTrigger id={ids.entity} className="w-full">
                  <SelectValue placeholder={t('wizard.upload.entityPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {labels.entityChoice(code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-3">
              {t('wizard.approve.newHint')}
            </p>
          </div>
        ) : null}
      </div>
      {fileConnectors.length > 0 ? (
        <div className="space-y-3 rounded-md border border-border p-3 has-data-checked:border-primary">
          <div className="flex items-center gap-3">
            <RadioGroupItem id={ids.existing} value="existing" />
            <Label htmlFor={ids.existing} className="font-medium">
              {t('wizard.approve.existingConnector')}
            </Label>
          </div>
          {value.target === 'existing' ? (
            <Select
              value={value.existingId}
              onValueChange={(next) => {
                set({ existingId: next });
              }}
            >
              <SelectTrigger
                className="w-full sm:w-80"
                aria-label={t('wizard.approve.existingConnector')}
              >
                <SelectValue placeholder={t('wizard.approve.chooseConnector')} />
              </SelectTrigger>
              <SelectContent>
                {fileConnectors.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {t('wizard.approve.connectorOption', {
                      name: i18n.language === 'zh-CN' ? option.nameZh : option.name,
                      version: option.activeMappingVersion ?? 0,
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      ) : null}
    </RadioGroup>
  );
}

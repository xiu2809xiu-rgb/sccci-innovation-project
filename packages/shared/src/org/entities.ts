import { z } from 'zod';

/** Legal entities. MY01 is the future subsidiary used to demonstrate onboarding a new system. */
export const ENTITY_CODES = ['SG01', 'CN01', 'MY01'] as const;

export const entityCodeSchema = z.enum(ENTITY_CODES);

export type EntityCode = z.infer<typeof entityCodeSchema>;

export interface LegalEntityInfo {
  code: EntityCode;
  name: string;
  nameZh: string;
  country: 'SG' | 'CN' | 'MY';
  currency: 'SGD' | 'CNY' | 'MYR';
  timezone: string;
}

/** Synthetic entity reference data (the client is anonymised as Organisation E). */
export const LEGAL_ENTITIES: readonly LegalEntityInfo[] = [
  {
    code: 'SG01',
    name: 'Organisation E Singapore Pte. Ltd.',
    nameZh: 'E机构新加坡私人有限公司',
    country: 'SG',
    currency: 'SGD',
    timezone: 'Asia/Singapore',
  },
  {
    code: 'CN01',
    name: 'Organisation E Group HQ',
    nameZh: 'E机构集团总部',
    country: 'CN',
    currency: 'CNY',
    timezone: 'Asia/Shanghai',
  },
  {
    code: 'MY01',
    name: 'Organisation E Malaysia Sdn. Bhd.',
    nameZh: 'E机构马来西亚有限公司',
    country: 'MY',
    currency: 'MYR',
    timezone: 'Asia/Kuala_Lumpur',
  },
];

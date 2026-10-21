import authEn from './locales/en/auth.json';
import commonEn from './locales/en/common.json';
import connectorsEn from './locales/en/connectors.json';
import employeesEn from './locales/en/employees.json';
import integrationMapEn from './locales/en/integration-map.json';
import overviewEn from './locales/en/overview.json';
import settingsEn from './locales/en/settings.json';
import authZh from './locales/zh-CN/auth.json';
import commonZh from './locales/zh-CN/common.json';
import connectorsZh from './locales/zh-CN/connectors.json';
import employeesZh from './locales/zh-CN/employees.json';
import integrationMapZh from './locales/zh-CN/integration-map.json';
import overviewZh from './locales/zh-CN/overview.json';
import settingsZh from './locales/zh-CN/settings.json';

/**
 * The namespaces every session needs at first paint, bundled so the shell and
 * area 1's pages never flash untranslated keys. Areas 2 to 4 load theirs with
 * their routes (lazy-namespaces.ts).
 */
export const bundledResources = {
  en: {
    common: commonEn,
    auth: authEn,
    overview: overviewEn,
    employees: employeesEn,
    connectors: connectorsEn,
    integrationMap: integrationMapEn,
    settings: settingsEn,
  },
  'zh-CN': {
    common: commonZh,
    auth: authZh,
    overview: overviewZh,
    employees: employeesZh,
    connectors: connectorsZh,
    integrationMap: integrationMapZh,
    settings: settingsZh,
  },
} as const;

export const BUNDLED_NAMESPACES = Object.keys(
  bundledResources.en,
) as (keyof typeof bundledResources.en)[];

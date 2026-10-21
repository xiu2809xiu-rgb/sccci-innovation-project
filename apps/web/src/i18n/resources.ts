import analyticsEn from './locales/en/analytics.json';
import attendanceLeaveEn from './locales/en/attendance-leave.json';
import authEn from './locales/en/auth.json';
import commonEn from './locales/en/common.json';
import connectorsEn from './locales/en/connectors.json';
import employeesEn from './locales/en/employees.json';
import governanceEn from './locales/en/governance.json';
import integrationMapEn from './locales/en/integration-map.json';
import overviewEn from './locales/en/overview.json';
import reportsEn from './locales/en/reports.json';
import settingsEn from './locales/en/settings.json';
import workflowsEn from './locales/en/workflows.json';
import analyticsZh from './locales/zh-CN/analytics.json';
import attendanceLeaveZh from './locales/zh-CN/attendance-leave.json';
import authZh from './locales/zh-CN/auth.json';
import commonZh from './locales/zh-CN/common.json';
import connectorsZh from './locales/zh-CN/connectors.json';
import employeesZh from './locales/zh-CN/employees.json';
import governanceZh from './locales/zh-CN/governance.json';
import integrationMapZh from './locales/zh-CN/integration-map.json';
import overviewZh from './locales/zh-CN/overview.json';
import reportsZh from './locales/zh-CN/reports.json';
import settingsZh from './locales/zh-CN/settings.json';
import workflowsZh from './locales/zh-CN/workflows.json';

/**
 * One namespace per feature area, so each owner edits only their own files
 * (facts sheet section 9). English is the source language; resources.test.ts
 * keeps the Chinese files in step with it. This full catalogue feeds the
 * typed keys and the tests only: the app bundles the core namespaces
 * (bundled-resources.ts) and loads the others with their routes
 * (lazy-namespaces.ts).
 */
export const resources = {
  en: {
    common: commonEn,
    auth: authEn,
    overview: overviewEn,
    employees: employeesEn,
    connectors: connectorsEn,
    integrationMap: integrationMapEn,
    workflows: workflowsEn,
    attendanceLeave: attendanceLeaveEn,
    reports: reportsEn,
    governance: governanceEn,
    analytics: analyticsEn,
    settings: settingsEn,
  },
  'zh-CN': {
    common: commonZh,
    auth: authZh,
    overview: overviewZh,
    employees: employeesZh,
    connectors: connectorsZh,
    integrationMap: integrationMapZh,
    workflows: workflowsZh,
    attendanceLeave: attendanceLeaveZh,
    reports: reportsZh,
    governance: governanceZh,
    analytics: analyticsZh,
    settings: settingsZh,
  },
} as const;

export type Namespace = keyof (typeof resources)['en'];

export const NAMESPACES = Object.keys(resources.en) as Namespace[];

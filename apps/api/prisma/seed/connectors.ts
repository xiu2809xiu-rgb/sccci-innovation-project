import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { ConnectorStatus, ConnectorType } from '../../src/generated/prisma/client.js';

interface ConnectorSeed {
  id: string;
  name: string;
  nameZh: string;
  type: ConnectorType;
  region: string;
  entityCode: string | null;
  baseUrl: string | null;
  status: ConnectorStatus;
  /** A HuiTong mock stands in for the client's system; the UI labels it "Mock". */
  isMock: boolean;
  capabilities: string[];
  config: Record<string, string | number | boolean>;
  /** Environment variable names holding credentials; never the credentials. */
  secretRef: string | null;
}

/**
 * The systems HuiTong connects. Base URLs come from the environment so the
 * same seed works locally and inside docker compose.
 */
function connectors(env: NodeJS.ProcessEnv): ConnectorSeed[] {
  return [
    {
      id: 'sg-hr',
      name: 'Singapore HR (payroll, attendance and leave)',
      nameZh: '新加坡人力资源系统（薪资、考勤与休假）',
      type: ConnectorType.SG_HR_REST,
      region: 'SG',
      entityCode: 'SG01',
      baseUrl: env.SG_HR_BASE_URL ?? 'http://localhost:4101',
      status: ConnectorStatus.ACTIVE,
      isMock: true,
      capabilities: ['employees.read', 'employees.write', 'attendance.read', 'leave.read'],
      config: { pageSize: 100, auth: 'api-key' },
      secretRef: 'SG_HR_API_KEY',
    },
    {
      id: 'cn-hq',
      name: 'China HQ SAP HCM',
      nameZh: '集团总部 SAP 人力资源系统',
      type: ConnectorType.CN_HQ_SAP,
      region: 'CN',
      entityCode: 'CN01',
      baseUrl: env.CN_HQ_BASE_URL ?? 'http://localhost:4102',
      status: ConnectorStatus.ACTIVE,
      isMock: true,
      capabilities: ['employees.read', 'attendance.read', 'leave.read', 'org-units.read'],
      config: { pageSize: 200, auth: 'basic' },
      secretRef: 'CN_HQ_USERNAME,CN_HQ_PASSWORD',
    },
    {
      id: 'oa',
      name: 'OA approvals platform',
      nameZh: 'OA 审批平台',
      type: ConnectorType.OA_WEBHOOK,
      region: 'CN',
      entityCode: null,
      baseUrl: env.OA_BASE_URL ?? 'http://localhost:4103',
      status: ConnectorStatus.ACTIVE,
      isMock: true,
      capabilities: ['approvals.read', 'webhooks.receive'],
      config: { auth: 'bearer', webhookEvents: 'approval.completed' },
      secretRef: 'OA_API_TOKEN,OA_WEBHOOK_SECRET',
    },
    {
      id: 'excel-master',
      name: 'Legacy Excel employee master',
      nameZh: '旧版 Excel 员工主数据',
      type: ConnectorType.FILE_IMPORT,
      region: 'SG',
      entityCode: 'SG01',
      baseUrl: null,
      status: ConnectorStatus.DEPRECATED,
      isMock: false,
      capabilities: ['employees.import'],
      config: { formats: 'csv,xlsx', note: 'Being replaced by the canonical employee master' },
      secretRef: null,
    },
    {
      id: 'teams',
      name: 'Microsoft Teams and OneDrive (notifications, mocked)',
      nameZh: 'Microsoft Teams 与 OneDrive（通知，模拟）',
      type: ConnectorType.NOTIFICATION,
      region: 'SG',
      entityCode: 'SG01',
      baseUrl: null,
      status: ConnectorStatus.ACTIVE,
      isMock: true,
      capabilities: ['notifications.send'],
      config: {},
      secretRef: null,
    },
    {
      id: 'dingtalk',
      name: 'DingTalk and WeChat Work (notifications, mocked)',
      nameZh: '钉钉与企业微信（通知，模拟）',
      type: ConnectorType.NOTIFICATION,
      region: 'CN',
      entityCode: 'CN01',
      baseUrl: null,
      status: ConnectorStatus.ACTIVE,
      isMock: true,
      capabilities: ['notifications.send'],
      config: {},
      secretRef: null,
    },
  ];
}

export async function seedConnectors(
  prisma: PrismaClient,
  env: NodeJS.ProcessEnv,
): Promise<string> {
  const list = connectors(env);
  for (const connector of list) {
    await prisma.connector.upsert({
      where: { id: connector.id },
      create: connector,
      update: connector,
    });
  }
  return `${String(list.length)} connectors`;
}

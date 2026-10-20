import type { EntityCode, Role } from '@huitong/shared';
import { argon2id, hash } from 'argon2';

import type { PrismaClient } from '../../src/generated/prisma/client.js';

/** Shared password of every demo account (documented in the README; demo use only). */
export const DEMO_PASSWORD = 'HuiTong!Demo2026';

interface DemoUser {
  email: string;
  displayName: string;
  displayNameZh: string | null;
  role: Role;
  homeEntityCode: EntityCode;
  employeeNo: string;
  locale: 'en' | 'zh-CN';
}

/** One demo account per role; each is also a person in the synthetic workforce. */
export const DEMO_USERS: readonly DemoUser[] = [
  {
    email: 'farhan.ismail@orge.example',
    displayName: 'Farhan Ismail',
    displayNameZh: null,
    role: 'SYSTEM_ADMIN',
    homeEntityCode: 'SG01',
    employeeNo: 'E100008',
    locale: 'en',
  },
  {
    email: 'meiling.tan@orge.example',
    displayName: 'Tan Mei Ling',
    displayNameZh: '谭美玲',
    role: 'HR_SG',
    homeEntityCode: 'SG01',
    employeeNo: 'E100003',
    locale: 'en',
  },
  {
    email: 'xinyi.zhou@orge.example',
    displayName: 'Zhou Xinyi',
    displayNameZh: '周欣怡',
    role: 'HR_HQ',
    homeEntityCode: 'CN01',
    employeeNo: 'E100005',
    locale: 'zh-CN',
  },
  {
    email: 'arjun.menon@orge.example',
    displayName: 'Arjun Menon',
    displayNameZh: null,
    role: 'HIRING_MANAGER',
    homeEntityCode: 'SG01',
    employeeNo: 'E100006',
    locale: 'en',
  },
  {
    email: 'aisyah.nur@orge.example',
    displayName: 'Nur Aisyah',
    displayNameZh: null,
    role: 'ADMIN_OPS',
    homeEntityCode: 'SG01',
    employeeNo: 'E100007',
    locale: 'en',
  },
  {
    email: 'guoqiang.li@orge.example',
    displayName: 'Li Guoqiang',
    displayNameZh: '李国强',
    role: 'MANAGEMENT',
    homeEntityCode: 'CN01',
    employeeNo: 'E100001',
    locale: 'zh-CN',
  },
  {
    email: 'grace.lim@orge.example',
    displayName: 'Grace Lim',
    displayNameZh: '林慧敏',
    role: 'AUDITOR',
    homeEntityCode: 'SG01',
    employeeNo: 'E100009',
    locale: 'en',
  },
];

export async function seedUsers(prisma: PrismaClient): Promise<string> {
  const passwordHash = await hash(DEMO_PASSWORD, {
    type: argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  for (const user of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: { ...user, passwordHash },
      update: { ...user, passwordHash, isActive: true },
    });
  }
  return `${String(DEMO_USERS.length)} demo users`;
}

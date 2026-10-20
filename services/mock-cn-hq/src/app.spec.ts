import { generateWorkforce } from '@huitong/synthetic-data';
import { pino } from 'pino';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from './app.js';
import { CnHqStore } from './data/store.js';
import {
  cnAttendanceSchema,
  cnEmployeeSchema,
  cnLeaveSchema,
  cnOrgUnitSchema,
} from './schemas/cn-records.js';

const USER = 'huitong_test';
const PASS = 'test-password';
const AUTH = `Basic ${Buffer.from(`${USER}:${PASS}`).toString('base64')}`;
const FIXED_NOW = new Date('2026-10-20T04:00:00.000Z');
const { employees, drift } = generateWorkforce();

describe('mock CN HQ', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    const store = new CnHqStore(undefined, () => FIXED_NOW);
    app = createApp({
      config: { port: 0, username: USER, password: PASS },
      store,
      logger: pino({ level: 'silent' }),
    });
  });

  const get = (path: string) => request(app).get(path).set('Authorization', AUTH);

  it('reports health without authentication', async () => {
    await request(app).get('/health').expect(200, { status: 'ok', service: 'mock-cn-hq' });
  });

  it('rejects bad credentials in its own envelope', async () => {
    await request(app)
      .get('/sap/opu/hr/employees')
      .expect(401, { 返回码: 'E401', 消息: '认证失败' });
    await request(app)
      .get('/sap/opu/hr/employees')
      .set('Authorization', `Basic ${Buffer.from(`${USER}:nope`).toString('base64')}`)
      .expect(401);
  });

  it('lists all 120 employees with OData paging, each matching the HQ schema', async () => {
    const all = await get('/sap/opu/hr/employees?$top=200').expect(200);
    expect(all.body.返回码).toBe('0');
    expect(all.body.数据.总数).toBe(120);
    for (const employee of all.body.数据.列表) {
      expect(cnEmployeeSchema.safeParse(employee).success).toBe(true);
    }
    const second = await get('/sap/opu/hr/employees?$top=10&$skip=10').expect(200);
    expect(second.body.数据.列表[0].员工编号).toBe(all.body.数据.列表[10].员工编号);
    const tooMany = await get('/sap/opu/hr/employees?$top=201').expect(400);
    expect(tooMany.body.返回码).toBe('E400');
  });

  it('includes Singapore staff with SAP codes and Chinese localisation', async () => {
    const meiLing = (await get('/sap/opu/hr/employees/E100003').expect(200)).body.数据;
    expect(meiLing).toMatchObject({
      姓名: '谭美玲',
      英文名: 'TAN Mei Ling',
      法人公司: 'SG01',
      工作地点: '新加坡',
      雇佣状态: '3',
    });
    expect(meiLing.入职日期).toBe('2021/03/15');
  });

  it('shows its own drift and the truth for drift that belongs to SG HR', async () => {
    for (const entry of drift.filter((d) => d.system === 'cn-hq')) {
      const record = (await get(`/sap/opu/hr/employees/${entry.employeeNo}`).expect(200)).body.数据;
      if (entry.field === 'employmentStatus') {
        expect(record.雇佣状态).toBe('3');
        expect(record.离职日期).toBe('');
      }
      if (entry.field === 'familyName') {
        expect(record.英文名.startsWith('WU ')).toBe(true);
      }
      if (entry.field === 'hireDate') {
        expect(record.入职日期).toBe(entry.value.replaceAll('-', '/'));
      }
    }
    const sgSide = drift.find((d) => d.system === 'sg-hr');
    const truth = employees.find((e) => e.employeeNo === sgSide?.employeeNo);
    if (sgSide && truth) {
      const record = (await get(`/sap/opu/hr/employees/${sgSide.employeeNo}`).expect(200)).body
        .数据;
      expect(record.电子邮箱).toBe(truth.workEmail);
    }
  });

  it('serves organisation units with the executive office as root', async () => {
    const units = (await get('/sap/opu/hr/org-units').expect(200)).body.数据.列表;
    expect(units).toHaveLength(11);
    expect(units.every((u: unknown) => cnOrgUnitSchema.safeParse(u).success)).toBe(true);
    expect(units.find((u: { 组织单位: string }) => u.组织单位 === '50001000').上级组织).toBe('');
  });

  it('serves CN01 attendance and leave for a compact date range', async () => {
    const holiday = await get(
      '/sap/opu/hr/attendance?beginDate=20260925&endDate=20260925&$top=200',
    ).expect(200);
    expect(holiday.body.数据.总数).toBeGreaterThan(60);
    for (const record of holiday.body.数据.列表) {
      expect(cnAttendanceSchema.safeParse(record).success).toBe(true);
      expect(record.考勤状态).toBe('节假日');
    }
    const leave = await get(
      '/sap/opu/hr/leave?beginDate=20260701&endDate=20260930&$top=200',
    ).expect(200);
    expect(leave.body.数据.列表.every((l: unknown) => cnLeaveSchema.safeParse(l).success)).toBe(
      true,
    );
    expect(leave.body.数据.列表.some((l: { 假期类型: string }) => l.假期类型 === '探亲假')).toBe(
      true,
    );
    await get('/sap/opu/hr/attendance?beginDate=2026-07-01&endDate=20260930').expect(400);
    const types = (await get('/sap/opu/hr/leave-types').expect(200)).body.数据.列表;
    expect(types).toContainEqual({ 代码: 'TX', 名称: '调休' });
  });

  it('simulates direct edits in China Standard Time and resets', async () => {
    const updated = await request(app)
      .post('/sap/opu/hr/_admin/employees/E100005/update')
      .set('Authorization', AUTH)
      .send({ 职级: 'P7' })
      .expect(200);
    expect(updated.body.数据).toMatchObject({ 职级: 'P7', 最后修改时间: '2026/10/20 12:00:00' });
    await request(app).post('/sap/opu/hr/_admin/reset').set('Authorization', AUTH).expect(200);
    expect((await get('/sap/opu/hr/employees/E100005')).body.数据.职级).toBe('P6');
    await get('/sap/opu/hr/employees/E000000').expect(404, { 返回码: 'E404', 消息: '员工不存在' });
  });
});

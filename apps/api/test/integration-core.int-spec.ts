import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  conflictExplanationSchema,
  conflictSchema,
  connectorSummarySchema,
  dataEnvelopeSchema,
  employeeDetailSchema,
  employeeSummarySchema,
  healthCheckResultSchema,
  isMasked,
  listEnvelopeSchema,
  syncRunDetailSchema,
  syncRunSchema,
  type Conflict,
  type EmployeeDetail,
  type EmployeeField,
  type StartSyncRequest,
  type SyncRunDetail,
} from '@huitong/shared';
import request from 'supertest';

import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import {
  MOCK_CREDENTIALS,
  pointConnectorsAt,
  startHrSystems,
  type Listening,
} from './support/mock-systems.js';
import { resetEmployeeMaster } from './support/reset-data.js';
import { createTestApp, CSRF_HEADER, signedInClient, type TestClient } from './support/test-app.js';

const runEnvelope = dataEnvelopeSchema(syncRunSchema);
const runDetailEnvelope = dataEnvelopeSchema(syncRunDetailSchema);
const detailEnvelope = dataEnvelopeSchema(employeeDetailSchema);
const conflictEnvelope = dataEnvelopeSchema(conflictSchema);
const conflictList = listEnvelopeSchema(conflictSchema);
const employeeList = listEnvelopeSchema(employeeSummarySchema);
const TERMINAL = new Set(['SUCCEEDED', 'PARTIAL', 'FAILED']);

/** The four seeded disagreements on fields no single system owns (synthetic drift). */
const EXPECTED_CONFLICTS = [
  ['E100030', 'departmentCode'],
  ['E100033', 'jobTitle'],
  ['E100040', 'hireDate'],
  ['E100066', 'workEmail'],
];

function fieldOf(detail: EmployeeDetail, field: EmployeeField) {
  const view = detail.fields.find((candidate) => candidate.field === field);
  if (!view) throw new Error(`${detail.employeeNo} has no ${field} field`);
  return view;
}

describe('Integration core: sync, master, conflicts (integration)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let systems: { sgHr: Listening; cnHq: Listening };
  let restoreConnectors: () => Promise<void>;
  let hr: TestClient;

  function startSync(
    connectorId: string,
    body: Partial<StartSyncRequest>,
    client: TestClient = hr,
    idempotencyKey?: string,
  ) {
    const call = client.agent
      .post(`/api/v1/connectors/${connectorId}/sync`)
      .set(CSRF_HEADER, client.csrf);
    if (idempotencyKey) void call.set('Idempotency-Key', idempotencyKey);
    return call.send(body);
  }

  async function finished(id: string, client: TestClient = hr): Promise<SyncRunDetail> {
    const deadline = Date.now() + 25_000;
    for (;;) {
      const response = await client.agent.get(`/api/v1/sync-runs/${id}`).expect(200);
      const run = runDetailEnvelope.parse(response.body).data;
      if (TERMINAL.has(run.status)) return run;
      if (Date.now() > deadline) throw new Error(`Sync run ${id} is still ${run.status}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async function sync(connectorId: string, body: Partial<StartSyncRequest>) {
    const response = await startSync(connectorId, body).expect(202);
    return finished(runEnvelope.parse(response.body).data.id);
  }

  /** The flow HR follows: preview, then apply exactly that preview. */
  async function previewThenApply(connectorId: string) {
    const preview = await sync(connectorId, { mode: 'PREVIEW' });
    expect(preview.status).toBe('SUCCEEDED');
    const applied = await sync(connectorId, { mode: 'APPLY', previewRunId: preview.id });
    return { preview, applied };
  }

  async function detail(employeeNo: string, client: TestClient = hr): Promise<EmployeeDetail> {
    const response = await client.agent.get(`/api/v1/employees/${employeeNo}`).expect(200);
    return detailEnvelope.parse(response.body).data;
  }

  async function openConflicts(query = ''): Promise<Conflict[]> {
    const response = await hr.agent.get(`/api/v1/conflicts?pageSize=100${query}`).expect(200);
    return conflictList.parse(response.body).data;
  }

  async function conflictFor(employeeNo: string, field: EmployeeField): Promise<Conflict> {
    const conflict = (await openConflicts()).find(
      (candidate) => candidate.employeeNo === employeeNo && candidate.field === field,
    );
    if (!conflict) throw new Error(`No open ${field} conflict for ${employeeNo}`);
    return conflict;
  }

  async function changeInSgHr(employeeNo: string, patch: Record<string, unknown>) {
    await request(systems.sgHr.url)
      .post(`/api/_admin/employees/${employeeNo}/update`)
      .set('X-API-Key', MOCK_CREDENTIALS.SG_HR_API_KEY)
      .send(patch)
      .expect(200);
  }

  async function changeInCnHq(employeeNo: string, patch: Record<string, unknown>) {
    await request(systems.cnHq.url)
      .post(`/sap/opu/hr/_admin/employees/${employeeNo}/update`)
      .auth(MOCK_CREDENTIALS.CN_HQ_USERNAME, MOCK_CREDENTIALS.CN_HQ_PASSWORD)
      .send(patch)
      .expect(200);
  }

  beforeAll(async () => {
    systems = await startHrSystems();
    app = await createTestApp({
      SG_HR_API_KEY: MOCK_CREDENTIALS.SG_HR_API_KEY,
      CN_HQ_USERNAME: MOCK_CREDENTIALS.CN_HQ_USERNAME,
      CN_HQ_PASSWORD: MOCK_CREDENTIALS.CN_HQ_PASSWORD,
    });
    prisma = app.get(PrismaService);
    await resetEmployeeMaster(prisma);
    restoreConnectors = await pointConnectorsAt(prisma, {
      'sg-hr': systems.sgHr.url,
      'cn-hq': systems.cnHq.url,
    });
    hr = await signedInClient(app, 'HR_SG');
  });

  afterAll(async () => {
    await restoreConnectors();
    await app.close();
    await Promise.all([systems.sgHr.close(), systems.cnHq.close()]);
  });

  it('refuses anonymous callers and roles without the permission', async () => {
    await request(app.getHttpServer()).get('/api/v1/employees').expect(401);
    await request(app.getHttpServer()).get('/api/v1/connectors').expect(401);

    const hiringManager = await signedInClient(app, 'HIRING_MANAGER');
    await startSync('sg-hr', { mode: 'PREVIEW' }, hiringManager).expect(403);

    // Separation of duties: administrators run syncs but never settle HR data.
    const admin = await signedInClient(app, 'SYSTEM_ADMIN');
    await admin.agent
      .post('/api/v1/conflicts/01900000-0000-7000-8000-000000000000/resolve')
      .set(CSRF_HEADER, admin.csrf)
      .send({ resolution: 'SOURCE_SELECTED', connectorId: 'sg-hr' })
      .expect(403);
  });

  it('previews a sync without writing anything, and will not apply without a preview', async () => {
    await startSync('sg-hr', { mode: 'APPLY' }).expect(409);

    const preview = await sync('sg-hr', { mode: 'PREVIEW' });
    expect(preview).toMatchObject({
      status: 'SUCCEEDED',
      mode: 'PREVIEW',
      mappingVersion: 1,
      counts: { fetched: 50, created: 50, updated: 0, conflicts: 0, errors: 0 },
    });
    expect(preview.previewItems).toHaveLength(50);
    expect(preview.previewItems.every((item) => item.kind === 'CREATE')).toBe(true);
    expect(await prisma.employee.count()).toBe(0);
    expect(await prisma.sourceRecord.count()).toBe(0);

    // A preview from another connector does not unlock this one.
    await startSync('cn-hq', { mode: 'APPLY', previewRunId: preview.id }).expect(409);
  });

  it('applies the Singapore records, and the same sync again changes nothing', async () => {
    const { applied } = await previewThenApply('sg-hr');
    expect(applied).toMatchObject({
      status: 'SUCCEEDED',
      mode: 'APPLY',
      counts: { fetched: 50, created: 50, updated: 0, unchanged: 0, errors: 0 },
    });
    expect(await prisma.employee.count({ where: { entityCode: 'SG01' } })).toBe(50);

    const before = {
      changes: await prisma.employeeChange.count(),
      versions: await prisma.employee.aggregate({ _sum: { version: true } }),
      audit: await prisma.auditEvent.count({ where: { action: 'employee.updated' } }),
    };
    const again = await previewThenApply('sg-hr');
    expect(again.preview.previewItems).toEqual([]);
    expect(again.applied.counts).toMatchObject({ created: 0, updated: 0, unchanged: 50 });
    expect(await prisma.employeeChange.count()).toBe(before.changes);
    expect(await prisma.employee.aggregate({ _sum: { version: true } })).toEqual(before.versions);
    expect(await prisma.auditEvent.count({ where: { action: 'employee.updated' } })).toBe(
      before.audit,
    );
  });

  it('returns the same run for a repeated Idempotency-Key', async () => {
    const first = await startSync('sg-hr', { mode: 'PREVIEW' }, hr, 'repeat-key-0001').expect(202);
    const id = runEnvelope.parse(first.body).data.id;
    await finished(id);
    const second = await startSync('sg-hr', { mode: 'PREVIEW' }, hr, 'repeat-key-0001').expect(202);
    expect(runEnvelope.parse(second.body).data.id).toBe(id);
    expect(await prisma.syncRun.count({ where: { idempotencyKey: 'sg-hr:repeat-key-0001' } })).toBe(
      1,
    );
  });

  it('merges CN HQ: owned fields follow their owner, unowned disagreements open conflicts', async () => {
    const { preview, applied } = await previewThenApply('cn-hq');
    expect(preview.counts).toMatchObject({ created: 70, conflicts: 4, errors: 0 });
    expect(applied).toMatchObject({
      status: 'SUCCEEDED',
      counts: { fetched: 120, created: 70, updated: 50, unchanged: 0, conflicts: 4, errors: 0 },
    });

    const conflicts = await openConflicts();
    expect(conflicts.map((conflict) => [conflict.employeeNo, conflict.field]).sort()).toEqual(
      EXPECTED_CONFLICTS,
    );
    const department = await conflictFor('E100030', 'departmentCode');
    expect(department.candidates.map(({ connectorId, value }) => ({ connectorId, value }))).toEqual(
      expect.arrayContaining([
        { connectorId: 'sg-hr', value: 'COMP' },
        { connectorId: 'cn-hq', value: 'OPS' },
      ]),
    );

    // SG HR owns Singapore work phones: HQ's stale number is recorded but not used.
    const meiLing = await detail('E100003');
    const phone = fieldOf(meiLing, 'workPhone');
    expect(phone.value).toBe('+6585283001');
    expect(phone.sourceOfTruth).toEqual({ kind: 'POLICY', connectorId: 'sg-hr' });
    expect(phone.openConflictId).toBeNull();
    expect(phone.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ connectorId: 'sg-hr', value: '+6585283001', agrees: true }),
        expect.objectContaining({ connectorId: 'cn-hq', value: '+6581234570', agrees: false }),
      ]),
    );
    // HQ owns the Chinese name and grade, so they fill in from CN HQ.
    expect(meiLing.fullNameLocal).toBe('谭美玲');
    expect(fieldOf(meiLing, 'jobGrade')).toMatchObject({
      value: 'P5',
      sourceOfTruth: { kind: 'POLICY', connectorId: 'cn-hq' },
    });

    const repeat = await previewThenApply('cn-hq');
    expect(repeat.applied.counts).toMatchObject({
      created: 0,
      updated: 0,
      unchanged: 120,
      conflicts: 0,
    });
    expect(await openConflicts()).toHaveLength(4);
  });

  it('masks fields by role, including every source value in the drawer', async () => {
    const salary = (view: EmployeeDetail) => fieldOf(view, 'baseSalary');

    const hrView = salary(await detail('E100003'));
    expect(hrView.value).toEqual({ amount: 6700, currency: 'SGD' });

    const hq = await signedInClient(app, 'HR_HQ');
    const hqView = salary(await detail('E100003', hq));
    expect(hqView.value).toEqual({
      masked: true,
      classification: 'RESTRICTED',
      reason: 'CROSS_BORDER_NOT_APPROVED',
    });
    expect(hqView.sources.length).toBeGreaterThan(0);
    expect(hqView.sources.every((source) => isMasked(source.value))).toBe(true);

    const auditor = await signedInClient(app, 'AUDITOR');
    const auditorView = await detail('E100003', auditor);
    expect(fieldOf(auditorView, 'dateOfBirth').value).toEqual({
      masked: true,
      classification: 'CONFIDENTIAL',
      reason: 'ROLE_CLEARANCE',
    });
  });

  it('settles a conflict by choosing a source, audits it, and keeps the choice on later syncs', async () => {
    const conflict = await conflictFor('E100030', 'departmentCode');
    const response = await hr.agent
      .post(`/api/v1/conflicts/${conflict.id}/resolve`)
      .set(CSRF_HEADER, hr.csrf)
      .send({
        resolution: 'SOURCE_SELECTED',
        connectorId: 'sg-hr',
        note: 'SG HR has the August transfer',
      })
      .expect(200);
    expect(conflictEnvelope.parse(response.body).data).toMatchObject({
      status: 'RESOLVED',
      resolution: 'SOURCE_SELECTED',
      chosenConnectorId: 'sg-hr',
      resolvedValue: 'COMP',
    });
    const audit = await prisma.auditEvent.findFirst({
      where: { action: 'conflict.resolved', entityId: conflict.id },
    });
    expect(audit?.metadata).toMatchObject({ field: 'departmentCode', connectorId: 'sg-hr' });

    await hr.agent
      .post(`/api/v1/conflicts/${conflict.id}/resolve`)
      .set(CSRF_HEADER, hr.csrf)
      .send({ resolution: 'SOURCE_SELECTED', connectorId: 'cn-hq' })
      .expect(409);

    expect(fieldOf(await detail('E100030'), 'departmentCode')).toMatchObject({
      value: 'COMP',
      sourceOfTruth: { kind: 'HR_DECISION', connectorId: 'sg-hr' },
      openConflictId: null,
    });

    // HQ changes something else on the record: the merge reruns, HQ still says
    // OPS, and HR's choice stands without reopening the conflict.
    await changeInCnHq('E100030', { 职级: 'P5' });
    const { applied } = await previewThenApply('cn-hq');
    expect(applied.counts).toMatchObject({ updated: 1, conflicts: 0, errors: 0 });
    const after = await detail('E100030');
    expect(fieldOf(after, 'departmentCode').value).toBe('COMP');
    expect(fieldOf(after, 'jobGrade').value).toBe('P5');
    expect(await openConflicts('&field=departmentCode')).toEqual([]);
    expect(after.history).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'jobGrade',
          oldValue: 'P4',
          newValue: 'P5',
          source: 'SYNC',
          connectorId: 'cn-hq',
        }),
      ]),
    );
  });

  it('settles a conflict with a typed value only when it is valid and explained', async () => {
    const conflict = await conflictFor('E100040', 'hireDate');
    const sgValue = conflict.candidates.find((candidate) => candidate.connectorId === 'sg-hr')
      ?.value as string;
    const resolve = (body: object) =>
      hr.agent
        .post(`/api/v1/conflicts/${conflict.id}/resolve`)
        .set(CSRF_HEADER, hr.csrf)
        .send(body);

    await resolve({ resolution: 'MANUAL_VALUE', value: sgValue, note: 'ok' }).expect(400);
    await resolve({
      resolution: 'MANUAL_VALUE',
      value: '14 July 2016',
      note: 'Checked the signed offer letter',
    }).expect(400);
    await resolve({
      resolution: 'MANUAL_VALUE',
      value: sgValue,
      note: 'Checked the signed offer letter',
    }).expect(200);

    const record = await detail('E100040');
    expect(fieldOf(record, 'hireDate')).toMatchObject({ value: sgValue, openConflictId: null });
  });

  it('carries a change made in SG HR into the master on the next sync', async () => {
    await changeInSgHr('E100003', { mobile: '+65 8123 4599' });
    const { preview, applied } = await previewThenApply('sg-hr');
    expect(preview.previewItems).toEqual([
      expect.objectContaining({
        employeeNo: 'E100003',
        kind: 'UPDATE',
        field: 'workPhone',
        before: '+6585283001',
        after: '+6581234599',
      }),
    ]);
    expect(applied.counts).toMatchObject({ updated: 1, unchanged: 49, errors: 0 });
    const record = await detail('E100003');
    expect(fieldOf(record, 'workPhone').value).toBe('+6581234599');
    expect(record.history[0]).toMatchObject({
      field: 'workPhone',
      source: 'SYNC',
      connectorId: 'sg-hr',
      syncRunId: applied.id,
    });

    // History is masked like the record: work phones are CONFIDENTIAL.
    const auditor = await signedInClient(app, 'AUDITOR');
    const audited = (await detail('E100003', auditor)).history[0];
    expect(audited?.field).toBe('workPhone');
    expect(isMasked(audited?.oldValue)).toBe(true);
    expect(isMasked(audited?.newValue)).toBe(true);
  });

  it('refuses to apply a preview once the source has changed since, and writes nothing', async () => {
    await changeInSgHr('E100044', { mobile: '+65 8123 4501' });
    const preview = await sync('sg-hr', { mode: 'PREVIEW' });
    expect(preview.previewItems).toEqual([
      expect.objectContaining({ employeeNo: 'E100044', field: 'workPhone' }),
    ]);

    // Another edit reaches SG HR after HR has read the preview.
    await changeInSgHr('E100097', { mobile: '+65 8123 4502' });
    const before = {
      changes: await prisma.employeeChange.count(),
      audit: await prisma.auditEvent.count({ where: { action: 'employee.updated' } }),
    };
    const refused = await sync('sg-hr', { mode: 'APPLY', previewRunId: preview.id });
    expect(refused.status).toBe('FAILED');
    expect(refused.errors).toEqual([
      expect.objectContaining({ stage: 'LOAD', code: 'SOURCE_CHANGED' }),
    ]);
    expect(await prisma.employeeChange.count()).toBe(before.changes);
    expect(await prisma.auditEvent.count({ where: { action: 'employee.updated' } })).toBe(
      before.audit,
    );

    // A fresh preview shows both changes, and applying it writes them.
    const { preview: fresh, applied } = await previewThenApply('sg-hr');
    expect(fresh.previewItems.map((item) => item.employeeNo).sort()).toEqual([
      'E100044',
      'E100097',
    ]);
    expect(applied.status).toBe('SUCCEEDED');
    expect(applied.counts).toMatchObject({ updated: 2 });
  });

  it('explains a conflict in Chinese without applying anything, and records the AI usage', async () => {
    const conflict = await conflictFor('E100066', 'workEmail');
    const usageBefore = await prisma.aiUsageRecord.count({
      where: { feature: 'discrepancy-explainer' },
    });
    const response = await hr.agent
      .post(`/api/v1/conflicts/${conflict.id}/explain`)
      .set(CSRF_HEADER, hr.csrf)
      .send({ language: 'zh-CN' })
      .expect(200);
    const explanation = dataEnvelopeSchema(conflictExplanationSchema).parse(response.body).data;
    expect(explanation).toMatchObject({ conflictId: conflict.id, language: 'zh-CN' });
    expect(explanation.text).toMatch(/\p{Script=Han}/u);
    // No identifier reaches the model, so none can come back: not the number, not either email.
    expect(explanation.text).not.toContain('E100066');
    expect(explanation.text).not.toContain('@');
    expect(await prisma.aiUsageRecord.count({ where: { feature: 'discrepancy-explainer' } })).toBe(
      usageBefore + 1,
    );
    // Advice only: the conflict is still open.
    expect((await conflictFor('E100066', 'workEmail')).status).toBe('OPEN');
  });

  it('searches, filters and sorts the employee list', async () => {
    const list = async (query: string) =>
      employeeList.parse((await hr.agent.get(`/api/v1/employees?${query}`).expect(200)).body);

    expect((await list('entityCode=CN01&pageSize=1')).meta.total).toBe(70);
    expect((await list('q=E10003')).data.map((row) => row.employeeNo)).toContain('E100030');
    const conflicted = await list('conflicts=open');
    expect(conflicted.meta.total).toBe(2);
    expect(conflicted.data.every((row) => row.openConflictCount > 0)).toBe(true);
    const sources = (await list('q=E100003')).data[0]?.sources;
    expect(sources?.slice().sort()).toEqual(['cn-hq', 'sg-hr']);

    const byHireDate = (await list('sort=hireDate&direction=desc&pageSize=100')).data;
    expect(byHireDate.length).toBeGreaterThan(1);
    await hr.agent.get('/api/v1/employees?sort=salary').expect(400);
  });

  it('lists connectors with their mapping version and checks their health', async () => {
    const response = await hr.agent.get('/api/v1/connectors').expect(200);
    const connectors = dataEnvelopeSchema(connectorSummarySchema.array()).parse(response.body).data;
    expect(connectors.find((connector) => connector.id === 'sg-hr')).toMatchObject({
      syncable: true,
      isMock: true,
      activeMappingVersion: 1,
      latestRun: expect.objectContaining({ connectorId: 'sg-hr' }) as unknown,
    });
    expect(connectors.find((connector) => connector.id === 'oa')?.syncable).toBe(false);
    // Every system a HuiTong mock stands in for says so; the Excel file import is real.
    expect(
      connectors
        .filter((connector) => connector.isMock)
        .map((connector) => connector.id)
        .sort(),
    ).toEqual(['cn-hq', 'dingtalk', 'oa', 'sg-hr', 'teams']);

    const health = await hr.agent
      .post('/api/v1/connectors/cn-hq/health-check')
      .set(CSRF_HEADER, hr.csrf)
      .expect(200);
    expect(dataEnvelopeSchema(healthCheckResultSchema).parse(health.body).data.status).toBe('OK');
  });

  it('settles a run that lost its queue job instead of blocking the connector', async () => {
    const stuck = (minutesAgo: number) =>
      prisma.syncRun.create({
        data: {
          connectorId: 'sg-hr',
          trigger: 'MANUAL',
          mode: 'PREVIEW',
          status: 'RUNNING',
          idempotencyKey: `sg-hr:stuck-${String(minutesAgo)}-${String(Date.now())}`,
          queuedAt: new Date(Date.now() - minutesAgo * 60_000),
        },
      });

    // Just written: its job may still be on the way, so the connector stays busy.
    const fresh = await stuck(0);
    await startSync('sg-hr', { mode: 'PREVIEW' }).expect(409);
    await prisma.syncRun.delete({ where: { id: fresh.id } });

    const orphaned = await stuck(5);
    const response = await startSync('sg-hr', { mode: 'PREVIEW' }).expect(202);
    await finished(runEnvelope.parse(response.body).data.id);
    const settled = await finished(orphaned.id);
    expect(settled.status).toBe('FAILED');
    expect(settled.errors).toEqual([expect.objectContaining({ code: 'INTERRUPTED' })]);
  });
});

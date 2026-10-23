import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  dataEnvelopeSchema,
  employeeDetailSchema,
  isMasked,
  MAX_IMPORT_BYTES,
  MAX_IMPORT_ROWS,
  stagedImportSchema,
  suggestedMappings,
  type DateFormat,
  type EmployeeDetail,
  type EmployeeField,
  type FieldMapping,
  type MappingProposal,
} from '@huitong/shared';
import request from 'supertest';

import { SG_HR_BASELINE_MAPPING } from '../prisma/seed/baseline-mappings.js';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { AccessPolicyService } from '../src/modules/access/access-policy.service.js';
import {
  StagedImportStore,
  StagedImportUnavailableError,
} from '../src/modules/connectors/imports/staged-import.store.js';
import {
  approveFileConnector,
  approveNextVersion,
  connectorDetail,
  stageFile,
  startSync,
  syncAndWait,
} from './support/file-imports.js';
import { MOCK_CREDENTIALS, startHrSystems, type Listening } from './support/mock-systems.js';
import { resetEmployeeMaster, resetMappingProposals } from './support/reset-data.js';
import { createTestApp, CSRF_HEADER, signedInClient, type TestClient } from './support/test-app.js';

const SAMPLE = readFileSync(
  path.resolve(
    import.meta.dirname,
    '../../web/public/samples/organisation-e-malaysia-hr-export.csv',
  ),
);
const stagedEnvelope = dataEnvelopeSchema(stagedImportSchema);
const stagedOrNone = dataEnvelopeSchema(stagedImportSchema.nullable());
const detailEnvelope = dataEnvelopeSchema(employeeDetailSchema);

function fieldOf(detail: EmployeeDetail, field: EmployeeField) {
  const view = detail.fields.find((candidate) => candidate.field === field);
  if (!view) throw new Error(`${detail.employeeNo} has no ${field} field`);
  return view;
}
const JOINING_COMPANY = {
  name: 'Joining company HR',
  nameZh: '新公司人力资源系统',
  entityCode: 'MY01',
} as const;

/** Commas outside quotes: salaries such as "12,800.00" are quoted. */
const CELL_BOUNDARY = /,(?=(?:[^"]*"[^"]*")*[^"]*$)/;

/** The sample's lines and where one of its columns is. */
function sampleColumn(header: string): { lines: string[]; at: number } {
  const lines = SAMPLE.toString('utf8').split(/\r?\n/);
  const at = (lines[0] ?? '').split(',').indexOf(header);
  if (at === -1) throw new Error(`the sample has no ${header} column`);
  return { lines, at };
}

/** The sample without one column, rewritten as CSV text. */
function withoutColumn(header: string): Buffer {
  const { lines, at } = sampleColumn(header);
  return Buffer.from(
    lines
      .map((line) =>
        line === ''
          ? line
          : line
              .split(CELL_BOUNDARY)
              .filter((_cell, index) => index !== at)
              .join(','),
      )
      .join('\n'),
  );
}

/** The sample with one cell of one employee's row replaced. */
function withCell(staffId: string, header: string, value: string): Buffer {
  const { lines, at } = sampleColumn(header);
  return Buffer.from(
    lines
      .map((line) => {
        if (!line.startsWith(`${staffId},`)) return line;
        const cells = line.split(CELL_BOUNDARY);
        cells[at] = value;
        return cells.join(',');
      })
      .join('\n'),
  );
}

describe('File import through an approved mapping (integration)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let hr: TestClient;
  let connectorId: string;

  const stage = (content: Buffer, client: TestClient = hr) =>
    stageFile(client, connectorId, { content, name: 'hr-export.csv' });

  /** Audit events are append-only and outlive test runs, so count only those since the test began. */
  let testStarted = new Date();
  const auditedSinceStart = (action: string) =>
    prisma.auditEvent.count({
      where: { action, entityId: connectorId, occurredAt: { gte: testStarted } },
    });

  beforeEach(() => {
    testStarted = new Date();
  });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetEmployeeMaster(prisma);
    await resetMappingProposals(prisma);
    hr = await signedInClient(app, 'HR_SG');
    connectorId = await approveFileConnector(
      hr,
      { content: SAMPLE, name: 'hr-export.csv' },
      JOINING_COMPANY,
    );
  });

  afterAll(async () => {
    await app.get(StagedImportStore).delete(connectorId);
    await resetEmployeeMaster(prisma);
    await resetMappingProposals(prisma);
    await app.close();
  });

  it('shows the staged file to connector readers, and changes it only with the sync permission', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/connectors/${connectorId}/import-file`)
      .expect(401);
    const auditor = await signedInClient(app, 'AUDITOR');
    // The connector pages show the same summary to anyone who may read connectors.
    await auditor.agent.get(`/api/v1/connectors/${connectorId}/import-file`).expect(200);
    await stage(SAMPLE, auditor).expect(403);
    await auditor.agent
      .delete(`/api/v1/connectors/${connectorId}/import-file`)
      .set(CSRF_HEADER, auditor.csrf)
      .expect(403);
  });

  it('cannot sync a file connector before a file is staged', async () => {
    expect((await connectorDetail(hr, connectorId)).syncable).toBe(false);
    const refused = await startSync(hr, connectorId, { mode: 'PREVIEW' }).expect(409);
    expect(refused.body.error.code).toBe('IMPORT_FILE_MISSING');
  });

  it('takes no file for a connector that is being retired', async () => {
    const refused = await hr.agent
      .post('/api/v1/connectors/excel-master/import-file')
      .set(CSRF_HEADER, hr.csrf)
      .attach('file', SAMPLE, 'hr-export.csv')
      .expect(409);
    expect(refused.body.error.message).toBe(
      'excel-master is deprecated, so it takes no file to import',
    );
  });

  it('refuses a file that lacks a column the mapping reads', async () => {
    const refused = await stage(withoutColumn('入职日期')).expect(400);
    expect(refused.body.error.code).toBe('VALIDATION_FAILED');
    expect(refused.body.error.message).toBe(
      'The file has no column "入职日期", which the mapping reads',
    );
    // The UI words the problem in either language from these details.
    expect(refused.body.error.details).toContainEqual(
      expect.objectContaining({ problem: 'COLUMNS_MISSING', columns: ['入职日期'] }),
    );
  });

  it('refuses an export over the row limit, and a file over the size limit, rather than cut it short', async () => {
    const rows = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_row, index) =>
      String(index + 1).padStart(6, '0'),
    );
    const long = await stage(Buffer.from(`Staff ID\n${rows.join('\n')}\n`)).expect(400);
    expect(long.body.error.details).toContainEqual(
      expect.objectContaining({ problem: 'TOO_MANY_ROWS', limit: MAX_IMPORT_ROWS }),
    );
    const large = await stage(Buffer.alloc(MAX_IMPORT_BYTES + 1, 0x41)).expect(413);
    expect(large.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('leaves out a row holding a national ID number, by its line, and never stores the number', async () => {
    const response = await stage(withCell('E200105', 'Staff ID', 'S1234567D')).expect(201);
    const staged = stagedEnvelope.parse(response.body).data;
    // E200105 is the fifth data row, so the sixth line of the file.
    expect(staged).toMatchObject({
      rowCount: 11,
      rejectedCount: 1,
      rejectedRows: [{ line: 6, reason: 'NATIONAL_ID_VALUE' }],
    });
    const stored = await app.get(StagedImportStore).get(connectorId);
    expect(JSON.stringify(stored)).not.toContain('S1234567D');
  });

  it('says why no row could be kept when every row of a file is left out', async () => {
    // Staff IDs that are not in the form E123456, as another company's might be.
    const foreign = Buffer.from(SAMPLE.toString('utf8').replace(/^E2001(\d\d),/gm, 'MY-$1,'));
    const refused = await stage(foreign).expect(400);
    expect(refused.body.error.details).toContainEqual(
      expect.objectContaining({
        problem: 'NO_ROWS_KEPT',
        reasons: [{ reason: 'INVALID_EMPLOYEE_NUMBER', count: 12, firstLine: 2 }],
      }),
    );
  });

  it('keeps a file name to its last part, without control or direction characters', async () => {
    const response = await stageFile(hr, connectorId, {
      content: SAMPLE,
      name: 'exp\u202Eort.csv',
    }).expect(201);
    expect(stagedEnvelope.parse(response.body).data.fileName).toBe('exp_ort.csv');
    const staged = await prisma.auditEvent.findFirstOrThrow({
      where: {
        action: 'connector.import.staged',
        entityId: connectorId,
        occurredAt: { gte: testStarted },
      },
      select: { metadata: true },
    });
    expect(staged.metadata).toMatchObject({ fileName: 'exp_ort.csv' });
  });

  it('keeps a Chinese file name as the browser sent it', async () => {
    const response = await stageFile(hr, connectorId, {
      content: SAMPLE,
      name: '马来西亚员工导出.csv',
    }).expect(201);
    expect(stagedEnvelope.parse(response.body).data.fileName).toBe('马来西亚员工导出.csv');
  });

  it('stages the whole file, keeping only what the mapping reads and never the IC column', async () => {
    const response = await stage(SAMPLE).expect(201);
    const staged = stagedEnvelope.parse(response.body).data;
    expect(staged).toMatchObject({
      connectorId,
      fileName: 'hr-export.csv',
      rowCount: 12,
      rejectedCount: 0,
      mappingVersion: 1,
    });
    expect(staged.droppedColumns).toContainEqual({ header: 'IC No.', reason: 'PROHIBITED' });

    const stored = await app.get(StagedImportStore).get(connectorId);
    const kept = JSON.stringify(stored?.records);
    expect(kept).not.toContain('IC No.');
    expect(kept).not.toContain('XXXXXX-XX-XXXX');
    // The full account number never leaves the staging step.
    expect(kept).not.toContain('1140-2233-4501');
    expect(kept).toContain('••••4501');

    const current = await hr.agent.get(`/api/v1/connectors/${connectorId}/import-file`).expect(200);
    expect(stagedOrNone.parse(current.body).data).toEqual(staged);
    expect((await connectorDetail(hr, connectorId)).syncable).toBe(true);
    expect(await auditedSinceStart('connector.import.staged')).toBe(1);
  });

  it('reports a new record that lacks a required value, and previews the rest', async () => {
    await stage(withCell('E200105', 'Position', '')).expect(201);
    try {
      const preview = await syncAndWait(hr, connectorId, { mode: 'PREVIEW' });
      expect(preview).toMatchObject({ status: 'PARTIAL', counts: { created: 11, errors: 1 } });
      // The error names the field, never the row's values.
      expect(preview.errors).toEqual([
        {
          externalId: 'E200105',
          stage: 'VALIDATE',
          code: 'VALIDATION_FAILED',
          message: 'jobTitle: Invalid input: expected string, received null',
        },
      ]);
    } finally {
      // The whole sample again, for the apply below.
      await stage(SAMPLE).expect(201);
    }
  });

  it('previews and applies the staged file, and the draft connector becomes active', async () => {
    expect((await connectorDetail(hr, connectorId)).status).toBe('DRAFT');
    const preview = await syncAndWait(hr, connectorId, { mode: 'PREVIEW' });
    expect(preview).toMatchObject({ status: 'SUCCEEDED', counts: { created: 12, errors: 0 } });
    expect(await prisma.sourceRecord.count({ where: { connectorId } })).toBe(0);

    const applied = await syncAndWait(hr, connectorId, { mode: 'APPLY', previewRunId: preview.id });
    expect(applied).toMatchObject({ status: 'SUCCEEDED', counts: { created: 12 } });
    // The trail names the very file each run read.
    const requested = await prisma.auditEvent.findMany({
      where: { action: 'sync.run.requested', occurredAt: { gte: testStarted } },
      select: { metadata: true },
    });
    const sha256 = createHash('sha256').update(SAMPLE).digest('hex');
    expect(requested.map((event) => event.metadata)).toEqual([
      expect.objectContaining({ connectorId, file: { name: 'hr-export.csv', sha256 } }),
      expect.objectContaining({ connectorId, file: { name: 'hr-export.csv', sha256 } }),
    ]);

    // The rows joined the master with this connector as their source.
    expect(await prisma.sourceRecord.count({ where: { connectorId } })).toBe(12);
    const imported = await prisma.employee.findUniqueOrThrow({
      where: { employeeNo: 'E200101' },
      select: { entityCode: true, hireDate: true, bankAccountLast4: true },
    });
    expect(imported).toMatchObject({ entityCode: 'MY01', bankAccountLast4: '4501' });
    expect(imported.hireDate.toISOString().slice(0, 10)).toBe('2022-01-03');

    // The applied file is deleted, and the connector is no longer a draft.
    expect(await connectorDetail(hr, connectorId)).toMatchObject({
      status: 'ACTIVE',
      stagedImport: null,
      syncable: false,
    });
    expect(await app.get(StagedImportStore).get(connectorId)).toBeNull();
    for (const action of ['connector.import.cleared', 'connector.activated']) {
      expect(await auditedSinceStart(action)).toBe(1);
    }
  });

  it("shows another entity's HR only what an ACTIVE transfer entry shares from the new entity (B-7)", async () => {
    // Runs after the apply above, so the twelve MY01 records are in the master.
    const hq = await signedInClient(app, 'HR_HQ');
    const malaysiaRows = async (client: TestClient) => {
      const response = await client.agent.get('/api/v1/employees?entityCode=MY01').expect(200);
      return (response.body as { meta: { total: number } }).meta.total;
    };
    // The register has no entry from MY01 yet, so HR in Singapore and at HQ see none of them.
    for (const reader of [hr, hq]) {
      expect(await malaysiaRows(reader)).toBe(0);
      await reader.agent.get('/api/v1/employees/E200101').expect(404);
    }

    const access = app.get(AccessPolicyService);
    const entry = await prisma.crossBorderTransfer.create({
      data: {
        name: 'MY01 organisation data for Singapore HR (integration test)',
        fromEntityCode: 'MY01',
        toEntityCode: 'SG01',
        fromCountry: 'MY',
        toCountry: 'SG',
        dataCategories: ['identity', 'job-and-organisation', 'work-contact'],
        purpose: 'Integration test of the default deny across entities',
        legalBasis: 'Synthetic test entry',
        mechanism: 'Synthetic test entry',
        status: 'ACTIVE',
      },
    });
    try {
      await access.reload();
      expect(await malaysiaRows(hr)).toBe(12);
      const view = detailEnvelope.parse(
        (await hr.agent.get('/api/v1/employees/E200101').expect(200)).body,
      ).data;
      expect(isMasked(fieldOf(view, 'jobTitle').value)).toBe(false);
      // The entry shares no compensation, so the salary stays withheld from Singapore.
      expect(fieldOf(view, 'baseSalary').value).toMatchObject({
        masked: true,
        reason: 'CROSS_BORDER_NOT_APPROVED',
      });
      // The entry is for Singapore only: HQ still sees nothing of MY01.
      expect(await malaysiaRows(hq)).toBe(0);
    } finally {
      await prisma.crossBorderTransfer.delete({ where: { id: entry.id } });
      await access.reload();
    }
  });

  it('changes nothing when the same file is imported again', async () => {
    await stage(SAMPLE).expect(201);
    const preview = await syncAndWait(hr, connectorId, { mode: 'PREVIEW' });
    expect(preview).toMatchObject({
      status: 'SUCCEEDED',
      counts: { fetched: 12, created: 0, updated: 0, unchanged: 12, conflicts: 0, errors: 0 },
    });
    const applied = await syncAndWait(hr, connectorId, { mode: 'APPLY', previewRunId: preview.id });
    expect(applied).toMatchObject({
      status: 'SUCCEEDED',
      counts: { created: 0, updated: 0, unchanged: 12 },
    });
    expect(await prisma.sourceRecord.count({ where: { connectorId } })).toBe(12);
  });

  it('applies only the file its preview read: a file staged since is refused, and kept', async () => {
    await stage(SAMPLE).expect(201);
    const preview = await syncAndWait(hr, connectorId, { mode: 'PREVIEW' });
    // The same rows in a file that is not byte for byte the one previewed.
    const restaged = Buffer.concat([SAMPLE, Buffer.from('\n')]);
    await stage(restaged).expect(201);
    const applied = await syncAndWait(hr, connectorId, { mode: 'APPLY', previewRunId: preview.id });
    expect(applied.status).toBe('FAILED');
    expect(applied.errors.at(-1)?.code).toBe('SOURCE_CHANGED');
    const kept = await app.get(StagedImportStore).summary(connectorId);
    expect(kept?.sha256).toBe(createHash('sha256').update(restaged).digest('hex'));
  });

  it('deletes a file after an apply only while it is still the file that apply read', async () => {
    await stage(SAMPLE).expect(201);
    const store = app.get(StagedImportStore);
    const sha256 = (await store.summary(connectorId))?.sha256 ?? '';
    expect(await store.deleteIfSame(connectorId, 'f'.repeat(64))).toBe(false);
    expect(await store.summary(connectorId)).not.toBeNull();
    expect(await store.deleteIfSame(connectorId, sha256)).toBe(true);
    expect(await store.summary(connectorId)).toBeNull();
  });

  it('asks for the file again once a newer mapping version is approved', async () => {
    await stage(SAMPLE).expect(201);
    const version = await approveNextVersion(hr, connectorId, {
      content: SAMPLE,
      name: 'hr-export.csv',
    });
    expect(version).toBe(2);
    expect((await connectorDetail(hr, connectorId)).syncable).toBe(false);
    const refused = await startSync(hr, connectorId, { mode: 'PREVIEW' }).expect(409);
    expect(refused.body.error.code).toBe('IMPORT_FILE_OUTDATED');
  });

  it('discards a staged file on request', async () => {
    await stage(SAMPLE).expect(201);
    await hr.agent
      .delete(`/api/v1/connectors/${connectorId}/import-file`)
      .set(CSRF_HEADER, hr.csrf)
      .expect(204);
    const current = await hr.agent.get(`/api/v1/connectors/${connectorId}/import-file`).expect(200);
    expect(stagedOrNone.parse(current.body).data).toBeNull();
    expect(await auditedSinceStart('connector.import.discarded')).toBe(1);
  });

  it('takes no new mapping version for a connector that is being retired', async () => {
    const proposed = await hr.agent
      .post('/api/v1/mapping-proposals')
      .set(CSRF_HEADER, hr.csrf)
      .field('sourceSystemName', 'Legacy Excel master')
      .field('language', 'en')
      .attach('file', SAMPLE, 'hr-export.csv')
      .expect(201);
    const proposal = (proposed.body as { data: MappingProposal }).data;
    const refused = await hr.agent
      .post(`/api/v1/mapping-proposals/${proposal.id}/approve`)
      .set(CSRF_HEADER, hr.csrf)
      .send({
        mappings: suggestedMappings(proposal.columns, proposal.fixedValues),
        connector: { kind: 'existing', connectorId: 'excel-master' },
      })
      .expect(409);
    expect(refused.body.error.message).toBe(
      'excel-master is deprecated, so it takes no new mapping',
    );
  });

  it('still lists the connectors when Redis does not answer about staged files in time', async () => {
    await stage(SAMPLE).expect(201);
    const summary = vi
      .spyOn(app.get(StagedImportStore), 'summary')
      .mockRejectedValue(new StagedImportUnavailableError());
    try {
      const listed = await hr.agent.get('/api/v1/connectors').expect(200);
      const row = (
        listed.body as { data: { id: string; stagedImport: unknown; syncable: boolean }[] }
      ).data.find((connector) => connector.id === connectorId);
      expect(row).toMatchObject({ stagedImport: null, syncable: false });
    } finally {
      summary.mockRestore();
    }
  });

  it('takes files only for file connectors', async () => {
    const refused = await hr.agent
      .post('/api/v1/connectors/sg-hr/import-file')
      .set(CSRF_HEADER, hr.csrf)
      .attach('file', SAMPLE, 'hr-export.csv')
      .expect(409);
    expect(refused.body.error.message).toContain('not a file connector');
  });
});

/**
 * The INFO-TECH mock's employee export, as HR would download it, read through
 * a mapping that differs from the seeded SG HR mapping only in its column names
 * and date layout, and leaves out the pay and bank fields the export does not
 * carry: the claim that a real export replaces a mock one with only a mapping
 * change (stories A-5 and A-9).
 */
describe('An INFO-TECH export through the mapping engine (integration)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let hr: TestClient;
  let systems: { sgHr: Listening; cnHq: Listening };
  let connectorId: string;

  /** Each field the SG HR API sends, by its export header; pay and bank come in the payroll file. */
  const EXPORT_HEADERS: Record<string, string> = {
    employeeNo: 'Employee No',
    lastName: 'Surname',
    firstName: 'Given Name',
    fullName: 'Employee Name',
    preferredName: 'Preferred Name',
    email: 'Email',
    mobile: 'Mobile No',
    departmentCode: 'Department Code',
    jobTitle: 'Designation',
    reportsTo: 'Reporting Officer',
    employmentType: 'Employment Type',
    status: 'Employee Status',
    hireDate: 'Date Joined',
    resignationDate: 'Date Left',
    workLocation: 'Work Location',
    dateOfBirth: 'Date of Birth',
  };
  const DAY_FIRST: DateFormat = 'DD/MM/YYYY';
  const EXPORT_MAPPING: FieldMapping[] = SG_HR_BASELINE_MAPPING.flatMap((mapping) => {
    if (mapping.source === null) return [mapping];
    const header = EXPORT_HEADERS[mapping.source];
    if (!header) return [];
    return [
      {
        ...mapping,
        source: header,
        transform:
          mapping.transform.kind === 'date'
            ? { kind: 'date', format: DAY_FIRST }
            : mapping.transform,
      },
    ];
  });

  async function download(file: string): Promise<Buffer> {
    const response = await fetch(`${systems.sgHr.url}/api/exports/${file}`, {
      headers: { 'X-API-Key': MOCK_CREDENTIALS.SG_HR_API_KEY },
    });
    expect(response.status).toBe(200);
    return Buffer.from(await response.arrayBuffer());
  }

  beforeAll(async () => {
    systems = await startHrSystems();
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetEmployeeMaster(prisma);
    await resetMappingProposals(prisma);
    hr = await signedInClient(app, 'HR_SG');
  });

  afterAll(async () => {
    await app.get(StagedImportStore).delete(connectorId);
    await resetEmployeeMaster(prisma);
    await resetMappingProposals(prisma);
    await app.close();
    await Promise.all([systems.sgHr.close(), systems.cnHq.close()]);
  });

  it('imports every employee of the export, with dates read day first', async () => {
    const exported = { content: await download('employees.csv'), name: 'employees.csv' };
    connectorId = await approveFileConnector(
      hr,
      exported,
      { name: 'INFO-TECH export', nameZh: 'INFO-TECH 导出', entityCode: 'SG01' },
      () => EXPORT_MAPPING,
    );
    const staged = stagedEnvelope.parse(
      (await stageFile(hr, connectorId, exported).expect(201)).body,
    ).data;
    expect(staged).toMatchObject({ rowCount: 50, rejectedCount: 0 });

    const preview = await syncAndWait(hr, connectorId, { mode: 'PREVIEW' });
    expect(preview).toMatchObject({ status: 'SUCCEEDED', counts: { created: 50, errors: 0 } });
    const applied = await syncAndWait(hr, connectorId, { mode: 'APPLY', previewRunId: preview.id });
    expect(applied).toMatchObject({ status: 'SUCCEEDED', counts: { created: 50, errors: 0 } });
    expect(await prisma.sourceRecord.count({ where: { connectorId } })).toBe(50);

    const api = await fetch(`${systems.sgHr.url}/api/employees/E100003`, {
      headers: { 'X-API-Key': MOCK_CREDENTIALS.SG_HR_API_KEY },
    });
    const truth = (await api.json()) as {
      data: { hireDate: string; email: string; jobTitle: string };
    };
    const imported = await prisma.employee.findUniqueOrThrow({
      where: { employeeNo: 'E100003' },
      select: { hireDate: true, workEmail: true, jobTitle: true, departmentCode: true },
    });
    expect(imported.hireDate.toISOString().slice(0, 10)).toBe(truth.data.hireDate);
    expect(imported).toMatchObject({
      workEmail: truth.data.email.toLowerCase(),
      jobTitle: truth.data.jobTitle,
      departmentCode: 'HR',
    });
  });
});

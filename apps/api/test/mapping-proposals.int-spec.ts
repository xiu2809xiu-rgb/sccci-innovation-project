import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  dataEnvelopeSchema,
  listEnvelopeSchema,
  mappingProposalSchema,
  suggestedMappings,
  type FieldMapping,
  type MappingProposal,
} from '@huitong/shared';

import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { resetMappingProposals } from './support/reset-data.js';
import { createTestApp, CSRF_HEADER, signedInClient, type TestClient } from './support/test-app.js';

const proposalEnvelope = dataEnvelopeSchema(mappingProposalSchema);
const SAMPLE_PATH = path.resolve(
  import.meta.dirname,
  '../../web/public/samples/organisation-e-malaysia-hr-export.csv',
);
const SAMPLE = readFileSync(SAMPLE_PATH);
const ENCODINGS = path.resolve(import.meta.dirname, 'fixtures/encodings');
const encodingFixture = (name: string) => ({
  content: readFileSync(path.join(ENCODINGS, name)),
  name,
});
const SYSTEM_NAME = 'Organisation E Malaysia HR';
const NEW_CONNECTOR = {
  kind: 'new',
  name: SYSTEM_NAME,
  nameZh: '马来西亚人力资源系统',
  entityCode: 'MY01',
} as const;

describe('AI schema-mapping wizard (integration)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let hr: TestClient;

  function upload(
    client: TestClient,
    file: { content: Buffer; name: string } | null = { content: SAMPLE, name: 'my-hr-export.csv' },
    encoding?: string,
  ) {
    const call = client.agent
      .post('/api/v1/mapping-proposals')
      .set(CSRF_HEADER, client.csrf)
      .field('sourceSystemName', SYSTEM_NAME)
      .field('entityCode', 'MY01')
      .field('language', 'en');
    if (encoding) void call.field('encoding', encoding);
    return file ? call.attach('file', file.content, file.name) : call;
  }

  async function propose(): Promise<MappingProposal> {
    return proposalEnvelope.parse((await upload(hr).expect(201)).body).data;
  }

  function approve(
    proposal: MappingProposal,
    mappings: FieldMapping[],
    connector: object = NEW_CONNECTOR,
    client: TestClient = hr,
  ) {
    return client.agent
      .post(`/api/v1/mapping-proposals/${proposal.id}/approve`)
      .set(CSRF_HEADER, client.csrf)
      .send({ mappings, connector, note: 'Checked against the MY payroll export' });
  }

  function column(proposal: MappingProposal, sourceColumn: string) {
    const found = proposal.columns.find((candidate) => candidate.sourceColumn === sourceColumn);
    if (!found) throw new Error(`No proposal for ${sourceColumn}`);
    return found;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetMappingProposals(prisma);
    hr = await signedInClient(app, 'HR_SG');
  });

  afterAll(async () => {
    await resetMappingProposals(prisma);
    await app.close();
  });

  it('proposes a mapping for a file with Chinese headers and records the AI call', async () => {
    const usageBefore = await prisma.aiUsageRecord.count({ where: { feature: 'schema-mapping' } });
    const proposal = await propose();

    expect(proposal).toMatchObject({
      status: 'PENDING_REVIEW',
      entityCode: 'MY01',
      fileName: 'my-hr-export.csv',
      sampleRowCount: 12,
      provider: 'MOCK',
      mappingConfig: null,
    });
    expect(proposal.headers).toHaveLength(20);
    expect(column(proposal, 'Staff ID')).toMatchObject({ target: 'employeeNo' });
    expect(column(proposal, '入职日期')).toMatchObject({
      target: 'hireDate',
      transform: { kind: 'date', format: 'DD/MM/YYYY' },
    });
    expect(column(proposal, '中文姓名').target).toBe('fullNameLocal');
    expect(proposal.fixedValues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ target: 'entityCode', value: 'MY01' }),
        expect.objectContaining({ target: 'baseSalary.currency', value: 'MYR' }),
      ]),
    );
    // National ID numbers are never mapped, whatever the model says.
    expect(column(proposal, 'IC No.')).toMatchObject({ target: null, transform: null });
    expect(column(proposal, 'IC No.').flags).toContain('PROHIBITED_FIELD');

    const usage = await prisma.aiUsageRecord.findMany({
      where: { feature: 'schema-mapping' },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    expect(await prisma.aiUsageRecord.count({ where: { feature: 'schema-mapping' } })).toBe(
      usageBefore + 1,
    );
    const stored = await prisma.mappingProposal.findUniqueOrThrow({ where: { id: proposal.id } });
    expect(stored.aiUsageRecordId).toBe(usage[0]?.id);
    // Only headers and value shapes are kept: no sample value is stored.
    const kept = JSON.stringify(stored);
    expect(kept).not.toContain('meihua.lee@orge.example');
    expect(kept).not.toContain('1140-2233-4501');
    expect(kept).not.toContain('12,800.00');

    // Nothing is used until someone approves it.
    expect(await prisma.mappingConfig.count({ where: { proposalId: proposal.id } })).toBe(0);
  });

  it('refuses bad files with a clear validation error', async () => {
    const cases = [
      null,
      { content: Buffer.from('Staff ID,Email\n'), name: 'empty.csv' },
      { content: Buffer.from('Staff ID,Staff ID\nE200101,E200102\n'), name: 'duplicate.csv' },
      { content: Buffer.from('%PDF-1.7 not a sheet'), name: 'scan.pdf' },
      { content: Buffer.from('not a zip workbook'), name: 'fake.xlsx' },
    ];
    for (const file of cases) {
      const response = await upload(hr, file).expect(400);
      expect((response.body as { error: { code: string } }).error.code).toBe('VALIDATION_FAILED');
    }
  });

  it('reads a GBK file from Chinese Excel, and asks HR when two encodings fit', async () => {
    const gbk = await upload(hr, encodingFixture('gbk.csv')).expect(201);
    expect(proposalEnvelope.parse(gbk.body).data.headers).toEqual([
      '员工编号',
      '姓名',
      '部门',
      '入职日期',
      '在职状态',
    ]);

    const uncertain = await upload(hr, encodingFixture('ambiguous.csv')).expect(422);
    const { error } = uncertain.body as {
      error: { code: string; details: { readings: { encoding: string }[] } };
    };
    expect(error.code).toBe('SAMPLE_ENCODING_UNCERTAIN');
    expect(error.details.readings.map((reading) => reading.encoding)).toEqual(['gb18030', 'utf-8']);

    const chosen = await upload(hr, encodingFixture('ambiguous.csv'), 'gb18030').expect(201);
    expect(proposalEnvelope.parse(chosen.body).data.headers).toEqual(['隆垄', '拢陇', '楼娄搂篓']);

    const latin = await upload(hr, encodingFixture('windows-1252.csv')).expect(422);
    expect((latin.body as { error: { code: string } }).error.code).toBe(
      'SAMPLE_ENCODING_UNSUPPORTED',
    );
  });

  it('keeps proposing and approving with HR: administrators can do neither', async () => {
    const admin = await signedInClient(app, 'SYSTEM_ADMIN');
    await upload(admin).expect(403);
    const proposal = await propose();
    await approve(
      proposal,
      suggestedMappings(proposal.columns, proposal.fixedValues),
      NEW_CONNECTOR,
      admin,
    ).expect(403);
    await admin.agent.get('/api/v1/mapping-proposals').expect(403);
  });

  it('never saves a mapping that reads a national ID column', async () => {
    const proposal = await propose();
    const mappings = suggestedMappings(proposal.columns, proposal.fixedValues).map((mapping) =>
      mapping.target === 'jobGrade' ? { ...mapping, source: 'IC No.' } : mapping,
    );
    const response = await approve(proposal, mappings).expect(400);
    expect(JSON.stringify(response.body)).toContain('national ID');
    await approve(
      proposal,
      suggestedMappings(proposal.columns, proposal.fixedValues).map((mapping) =>
        mapping.target === 'jobGrade' ? { ...mapping, source: 'Not In The File' } : mapping,
      ),
    ).expect(400);
    expect(await prisma.mappingConfig.count({ where: { proposalId: proposal.id } })).toBe(0);
    expect(
      (await prisma.mappingProposal.findUniqueOrThrow({ where: { id: proposal.id } })).status,
    ).toBe('PENDING_REVIEW');
  });

  it('saves version 1 for a new system only on approval, then version 2 with HR edits', async () => {
    const proposal = await propose();
    const suggested = suggestedMappings(proposal.columns, proposal.fixedValues);
    const response = await approve(proposal, suggested).expect(200);
    const approved = proposalEnvelope.parse(response.body).data;
    expect(approved).toMatchObject({
      status: 'APPROVED',
      reviewNote: 'Checked against the MY payroll export',
      mappingConfig: { connectorId: 'file-organisation-e-malaysia-hr', version: 1 },
    });
    expect(approved.reviewedBy?.displayName).toBeTruthy();

    const connector = await prisma.connector.findUniqueOrThrow({
      where: { id: 'file-organisation-e-malaysia-hr' },
    });
    expect(connector).toMatchObject({ status: 'DRAFT', type: 'FILE_IMPORT', entityCode: 'MY01' });
    const v1 = await prisma.mappingConfig.findFirstOrThrow({
      where: { connectorId: connector.id, version: 1 },
    });
    expect(v1).toMatchObject({ status: 'ACTIVE', proposalId: proposal.id });
    expect(v1.approvedByUserId).not.toBeNull();
    const approvedAudit = await prisma.auditEvent.findFirst({
      where: { action: 'mapping.approved', entityId: v1.id },
    });
    expect(approvedAudit?.metadata).toMatchObject({ version: 1, edits: 0 });

    // Approving twice is refused; the version is not duplicated.
    await approve(proposal, suggested).expect(409);
    expect(await prisma.mappingConfig.count({ where: { connectorId: connector.id } })).toBe(1);

    // A second sample for the same system, approved with one mapping removed.
    const next = await propose();
    const edited = suggestedMappings(next.columns, next.fixedValues).filter(
      (mapping) => mapping.target !== 'jobGrade',
    );
    const second = proposalEnvelope.parse(
      (await approve(next, edited, { kind: 'existing', connectorId: connector.id }).expect(200))
        .body,
    ).data;
    expect(second.mappingConfig).toMatchObject({ connectorId: connector.id, version: 2 });
    const versions = await prisma.mappingConfig.findMany({
      where: { connectorId: connector.id },
      orderBy: { version: 'asc' },
      select: { version: true, status: true, id: true },
    });
    expect(versions.map(({ version, status }) => ({ version, status }))).toEqual([
      { version: 1, status: 'ARCHIVED' },
      { version: 2, status: 'ACTIVE' },
    ]);
    const editAudit = await prisma.auditEvent.findFirst({
      where: { action: 'mapping.approved', entityId: versions[1]?.id },
    });
    expect(editAudit?.metadata).toMatchObject({ version: 2, edits: 1 });
  });

  it('rejects a proposal and marks its AI call as rejected', async () => {
    const proposal = await propose();
    const stored = await prisma.mappingProposal.findUniqueOrThrow({ where: { id: proposal.id } });
    const reject = () =>
      hr.agent
        .post(`/api/v1/mapping-proposals/${proposal.id}/reject`)
        .set(CSRF_HEADER, hr.csrf)
        .send({ note: 'Wrong export: this is the leave report' });

    const response = await reject().expect(200);
    expect(proposalEnvelope.parse(response.body).data.status).toBe('REJECTED');
    const usage = await prisma.aiUsageRecord.findUniqueOrThrow({
      where: { id: stored.aiUsageRecordId ?? '' },
    });
    expect(usage.outcome).toBe('REJECTED');
    await reject().expect(409);
    await approve(proposal, suggestedMappings(proposal.columns, proposal.fixedValues)).expect(409);
  });

  it('lists proposals by status', async () => {
    const response = await hr.agent
      .get('/api/v1/mapping-proposals?status=PENDING_REVIEW&pageSize=50')
      .expect(200);
    const { data, meta } = listEnvelopeSchema(mappingProposalSchema).parse(response.body);
    expect(meta.total).toBeGreaterThanOrEqual(1);
    expect(data.every((proposal) => proposal.status === 'PENDING_REVIEW')).toBe(true);
  });
});

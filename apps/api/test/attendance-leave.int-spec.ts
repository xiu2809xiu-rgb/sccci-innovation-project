import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  COMPANY_MONTHLY_TEMPLATE,
  consolidationRunDetailSchema,
  consolidationRunSummarySchema,
  dataEnvelopeSchema,
  errorEnvelopeSchema,
  leaveCategoryMappingSchema,
  listEnvelopeSchema,
  reportTemplateSchema,
  templatePreviewSchema,
} from '@huitong/shared';
import request from 'supertest';

import { createOpenApiDocument } from '../src/bootstrap/swagger.js';
import { createTestApp, CSRF_HEADER, signedInClient } from './support/test-app.js';

const runs = listEnvelopeSchema(consolidationRunSummarySchema);
const run = dataEnvelopeSchema(consolidationRunDetailSchema);
const mappings = listEnvelopeSchema(leaveCategoryMappingSchema);
const template = dataEnvelopeSchema(reportTemplateSchema);
const preview = dataEnvelopeSchema(templatePreviewSchema);

/** The sample's September run, which needs review. */
const SEPTEMBER_RUN = '0199a3b1-0c40-7e21-9f3a-2c4d6e8f0a91';

describe('Attendance and leave (integration, area 3 head start)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires a session', async () => {
    await request(app.getHttpServer()).get('/api/v1/attendance-leave/runs').expect(401);
  });

  it('documents every route in the OpenAPI document', () => {
    expect(Object.keys(createOpenApiDocument(app).paths)).toEqual(
      expect.arrayContaining([
        '/api/v1/attendance-leave/runs',
        '/api/v1/attendance-leave/runs/{runId}',
        '/api/v1/attendance-leave/runs/{runId}/export',
        '/api/v1/attendance-leave/category-mappings',
        '/api/v1/attendance-leave/category-mappings/{mappingId}',
        '/api/v1/attendance-leave/template',
        '/api/v1/attendance-leave/template/preview',
      ]),
    );
  });

  it('lists the runs as sample data, and shows a run with only the caller’s entity’s exceptions', async () => {
    const hr = await signedInClient(app, 'HR_SG');
    const list = runs.parse((await hr.agent.get('/api/v1/attendance-leave/runs').expect(200)).body);
    expect(list.meta).toMatchObject({ mock: true, total: 3 });
    expect(list.data.map((item) => item.status)).toEqual(['NEEDS_REVIEW', 'FAILED', 'SUCCEEDED']);

    const hq = await signedInClient(app, 'HR_HQ');
    const detail = run.parse(
      (await hq.agent.get(`/api/v1/attendance-leave/runs/${SEPTEMBER_RUN}`).expect(200)).body,
    );
    expect(detail.data.exceptions.every((item) => item.entityCode === 'CN01')).toBe(true);
    expect(detail.data.withheldExceptionCount).toBe(3);
    await hq.agent.get('/api/v1/attendance-leave/runs/no-such-run').expect(404);
  });

  it('reads the seeded leave-category rules from the database, not from a sample', async () => {
    const hr = await signedInClient(app, 'HR_SG');
    const body = mappings.parse(
      (
        await hr.agent
          .get('/api/v1/attendance-leave/category-mappings?connectorId=cn-hq&pageSize=50')
          .expect(200)
      ).body,
    );
    expect(body.meta.mock).toBeUndefined();
    const byCode = new Map(body.data.map((rule) => [rule.sourceCategory, rule]));
    expect(byCode.get('NJ')).toMatchObject({ sourceLabel: '年假', canonicalCategory: 'ANNUAL' });
    expect(byCode.get('TX')).toMatchObject({
      sourceLabel: '调休',
      canonicalCategory: 'TIME_OFF_IN_LIEU',
    });
    expect(byCode.get('TQJ')).toMatchObject({
      canonicalCategory: 'HOME_LEAVE',
      templateColumn: null,
    });
  });

  it('serves the seeded template, and a preview of the caller’s entity labelled as sample data', async () => {
    const hr = await signedInClient(app, 'HR_SG');
    const seeded = template.parse(
      (await hr.agent.get('/api/v1/attendance-leave/template').expect(200)).body,
    );
    expect(seeded.data).toEqual(COMPANY_MONTHLY_TEMPLATE);
    expect(seeded.meta).toBeUndefined();

    const body = preview.parse(
      (await hr.agent.get('/api/v1/attendance-leave/template/preview?period=2026-09').expect(200))
        .body,
    );
    expect(body.meta).toEqual({ mock: true });
    expect(body.data.entityCode).toBe('SG01');
    expect(body.data.rows.every((row) => row.values.entity === 'SG01')).toBe(true);
    await hr.agent.get('/api/v1/attendance-leave/template/preview?period=2026-13').expect(400);
  });

  it('refuses roles without the permission, and answers NOT_IMPLEMENTED for the owner’s commands', async () => {
    const adminOps = await signedInClient(app, 'ADMIN_OPS');
    await adminOps.agent.get('/api/v1/attendance-leave/runs').expect(403);

    const management = await signedInClient(app, 'MANAGEMENT');
    await management.agent
      .post('/api/v1/attendance-leave/runs')
      .set(CSRF_HEADER, management.csrf)
      .send({ period: '2026-10', entityCodes: ['SG01', 'CN01'] })
      .expect(403);

    const hr = await signedInClient(app, 'HR_SG');
    const started = await hr.agent
      .post('/api/v1/attendance-leave/runs')
      .set(CSRF_HEADER, hr.csrf)
      .send({ period: '2026-10', entityCodes: ['SG01', 'CN01'] })
      .expect(501);
    expect(errorEnvelopeSchema.parse(started.body).error.code).toBe('NOT_IMPLEMENTED');
    await hr.agent
      .post(`/api/v1/attendance-leave/runs/${SEPTEMBER_RUN}/export`)
      .set(CSRF_HEADER, hr.csrf)
      .expect(501);
  });

  // Area 3 turns these into real tests as it builds the engine (docs/team/area-3-competency-and-submissions.md).
  it.todo('consolidates one month of SG and CN data into the company template (D-1 to D-4)');
  it.todo('lists every unmapped source category as an exception, and maps nothing by guess (D-2)');
  it.todo('refuses an invalid mapping rule with 400, and audits an approved one (D-2)');
  it.todo(
    'exports .xlsx without the fields the register withholds from the requester, audited (D-4)',
  );
  it.todo('drops meta.mock once the Prisma repository replaces the sample');
});

import type { NestExpressApplication } from '@nestjs/platform-express';
import {
  dataEnvelopeSchema,
  errorEnvelopeSchema,
  listEnvelopeSchema,
  workflowBoardSchema,
  workflowInstanceDetailSchema,
  workflowInstanceSummarySchema,
  workflowTaskViewSchema,
} from '@huitong/shared';
import request from 'supertest';

import { createOpenApiDocument } from '../src/bootstrap/swagger.js';
import { createTestApp, CSRF_HEADER, signedInClient } from './support/test-app.js';

const board = dataEnvelopeSchema(workflowBoardSchema);
const detail = dataEnvelopeSchema(workflowInstanceDetailSchema);
const instances = listEnvelopeSchema(workflowInstanceSummarySchema);
const tasks = listEnvelopeSchema(workflowTaskViewSchema);

/** The sample's software-engineer hire (OA-2026-000102), at the desk step. */
const TECHNOLOGY_HIRE = '0198d6e2-1b40-7f63-9d15-6a2e4c8b7f02';

describe('Workflows (integration, area 2 head start)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires a session', async () => {
    await request(app.getHttpServer()).get('/api/v1/workflows/board').expect(401);
  });

  it('documents every workflow route in the OpenAPI document', () => {
    const paths = Object.keys(createOpenApiDocument(app).paths);
    expect(paths).toEqual(
      expect.arrayContaining([
        '/api/v1/workflows/board',
        '/api/v1/workflows/instances',
        '/api/v1/workflows/instances/{instanceId}',
        '/api/v1/workflows/tasks',
        '/api/v1/workflows/tasks/{taskId}/complete',
      ]),
    );
  });

  it('serves the board in the shared contract, labelled as sample data', async () => {
    const hr = await signedInClient(app, 'HR_SG');
    const body = board.parse((await hr.agent.get('/api/v1/workflows/board').expect(200)).body);
    expect(body.meta).toEqual({ mock: true });
    expect(body.data.definition.key).toBe('manpower-to-onboarding');
    const recruit = body.data.columns.find((column) => column.step.key === 'recruit');
    expect(recruit?.instances[0]?.source.requestId).toBe('OA-2026-000101');
  });

  it('pages and searches the instance list', async () => {
    const management = await signedInClient(app, 'MANAGEMENT');
    const response = await management.agent
      .get('/api/v1/workflows/instances?q=OA-2026-000102&pageSize=10')
      .expect(200);
    const body = instances.parse(response.body);
    expect(body.meta).toEqual({ page: 1, pageSize: 10, total: 1, mock: true });
    expect(body.data[0]?.id).toBe(TECHNOLOGY_HIRE);
  });

  it('shows one instance with its approval chain and timeline, and 404 for an unknown one', async () => {
    const auditor = await signedInClient(app, 'AUDITOR');
    const body = detail.parse(
      (await auditor.agent.get(`/api/v1/workflows/instances/${TECHNOLOGY_HIRE}`).expect(200)).body,
    );
    expect(body.data.approvalChain.map((step) => step.action)).toEqual([
      'SUBMIT',
      'APPROVE',
      'APPROVE',
      'APPROVE',
    ]);
    expect(body.data.draftRecord).toEqual({ employeeNo: 'E100121', status: 'PRE_HIRE' });

    const missing = await auditor.agent.get('/api/v1/workflows/instances/no-such-id').expect(404);
    expect(errorEnvelopeSchema.parse(missing.body).error.code).toBe('NOT_FOUND');
  });

  it("lists the caller's role's tasks, and every task only for roles that manage workflows", async () => {
    const adminOps = await signedInClient(app, 'ADMIN_OPS');
    const mine = tasks.parse(
      (await adminOps.agent.get('/api/v1/workflows/tasks').expect(200)).body,
    );
    expect(mine.data.map((task) => [task.stepKey, task.sla])).toEqual([['desk', 'DUE_SOON']]);
    await adminOps.agent.get('/api/v1/workflows/tasks?scope=all').expect(403);

    const hr = await signedInClient(app, 'HR_SG');
    const all = tasks.parse(
      (await hr.agent.get('/api/v1/workflows/tasks?scope=all').expect(200)).body,
    );
    expect(all.data.map((task) => task.stepKey)).toEqual(['recruit', 'desk', 'recruit']);
  });

  it('refuses the task list to roles without workflows:tasks', async () => {
    const management = await signedInClient(app, 'MANAGEMENT');
    await management.agent.get('/api/v1/workflows/tasks').expect(403);
  });

  it('answers NOT_IMPLEMENTED for completing a task, and 403 to roles without workflows:tasks', async () => {
    const adminOps = await signedInClient(app, 'ADMIN_OPS');
    const response = await adminOps.agent
      .post('/api/v1/workflows/tasks/0198d6e2-1b40-7f63-9d15-000000000006/complete')
      .set(CSRF_HEADER, adminOps.csrf)
      .send({ note: 'Desk 18-07 and access card ready' })
      .expect(501);
    expect(errorEnvelopeSchema.parse(response.body).error.code).toBe('NOT_IMPLEMENTED');

    const auditor = await signedInClient(app, 'AUDITOR');
    await auditor.agent
      .post('/api/v1/workflows/tasks/0198d6e2-1b40-7f63-9d15-000000000006/complete')
      .set(CSRF_HEADER, auditor.csrf)
      .send({})
      .expect(403);
  });

  // Area 2 turns these into real tests as it replaces the sample (docs/team/area-2-workflow-automation.md).
  it.todo(
    'starts exactly one instance for an approved mock-oa manpower request, even if delivered twice (C-1)',
  );
  it.todo('starts no instance for a rejected request, and records the outcome (C-1)');
  it.todo('moves the instance on when a task is completed, and audits it (C-6)');
  it.todo('answers 409 CONFLICT for a transition the state machine refuses (C-2)');
  it.todo('creates a draft PRE_HIRE record in the master for a confirmed hire (C-3, B-6)');
  it.todo('creates the admin preparation tasks for ADMIN_OPS with due dates (C-4)');
  it.todo('drops meta.mock once the Prisma repository replaces the sample');
});

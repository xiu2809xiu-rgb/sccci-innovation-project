import { generateWorkforce } from '@huitong/synthetic-data';
import { pino } from 'pino';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from './app.js';
import { SgHrStore } from './data/store.js';
import { sgAttendanceSchema, sgEmployeeSchema, sgLeaveSchema } from './schemas/sg-records.js';

const API_KEY = 'test-api-key-123';
const FIXED_NOW = new Date('2026-10-20T04:00:00.000Z');
const { drift } = generateWorkforce();

function build() {
  const store = new SgHrStore(undefined, () => FIXED_NOW);
  const app = createApp({
    config: { port: 0, apiKey: API_KEY },
    store,
    logger: pino({ level: 'silent' }),
  });
  return { app, store };
}

describe('mock SG HR', () => {
  let app: ReturnType<typeof build>['app'];

  beforeEach(() => {
    ({ app } = build());
  });

  const get = (path: string) => request(app).get(path).set('X-API-Key', API_KEY);

  it('reports health without authentication', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', service: 'mock-sg-hr' });
  });

  it('rejects missing or wrong API keys in its own error format', async () => {
    await request(app)
      .get('/api/employees')
      .expect(401, { error: 'unauthorized', message: 'Invalid or missing API key' });
    await request(app).get('/api/employees').set('X-API-Key', 'wrong').expect(401);
  });

  it('lists the 50 Singapore employees, each matching the SG HR schema', async () => {
    const response = await get('/api/employees?pageSize=100').expect(200);
    expect(response.body.total).toBe(50);
    expect(response.body.data).toHaveLength(50);
    for (const employee of response.body.data) {
      expect(sgEmployeeSchema.safeParse(employee).success).toBe(true);
    }
  });

  it('paginates with its defaults and rejects page sizes over 100', async () => {
    const first = await get('/api/employees').expect(200);
    expect(first.body).toMatchObject({ page: 1, pageSize: 50, total: 50 });
    const second = await get('/api/employees?page=2&pageSize=20').expect(200);
    expect(second.body.data).toHaveLength(20);
    expect(second.body.data[0].employeeNo > first.body.data[19].employeeNo).toBe(true);
    const tooBig = await get('/api/employees?pageSize=101').expect(400);
    expect(tooBig.body.error).toBe('bad_request');
  });

  it('shows its own drift and the truth for drift that belongs to CN HQ', async () => {
    const own = drift.find((d) => d.system === 'sg-hr');
    expect(own).toBeDefined();
    if (own) {
      const response = await get(`/api/employees/${own.employeeNo}`).expect(200);
      expect(response.body.data.email).toBe(own.value);
    }
    const phoneDrift = drift.find((d) => d.employeeNo === 'E100003' && d.field === 'workPhone');
    const meiLing = await get('/api/employees/E100003').expect(200);
    expect(meiLing.body.data.mobile.replace(/ /g, '')).not.toBe(phoneDrift?.value);
    expect(meiLing.body.data.firstName).toBe('Mei Ling');
  });

  it('filters by updatedSince', async () => {
    const response = await get('/api/employees?updatedSince=2026-10-01T00:00:00Z').expect(200);
    expect(response.body.total).toBeGreaterThan(0);
    expect(response.body.total).toBeLessThan(50);
  });

  it('creates, rejects duplicates and patches employees', async () => {
    const existing = (await get('/api/employees/E100003').expect(200)).body.data;
    const { lastModified: _lastModified, ...body } = existing;
    const created = await request(app)
      .post('/api/employees')
      .set('X-API-Key', API_KEY)
      .send({ ...body, employeeNo: 'E199999', email: 'new.hire@orge.example' })
      .expect(201);
    expect(created.body.data.lastModified).toBe('2026-10-20T04:00:00Z');
    await request(app)
      .post('/api/employees')
      .set('X-API-Key', API_KEY)
      .send({ ...body })
      .expect(409);
    const patched = await request(app)
      .patch('/api/employees/E199999')
      .set('X-API-Key', API_KEY)
      .send({ jobTitle: 'Senior HR Executive' })
      .expect(200);
    expect(patched.body.data.jobTitle).toBe('Senior HR Executive');
    await request(app)
      .patch('/api/employees/E199999')
      .set('X-API-Key', API_KEY)
      .send({ employeeNo: 'E100001' })
      .expect(400);
  });

  it('simulates direct edits and restores the dataset on reset', async () => {
    await request(app)
      .post('/api/_admin/employees/E100006/update')
      .set('X-API-Key', API_KEY)
      .send({ jobTitle: 'Managing Director, Wealth Management' })
      .expect(200);
    expect((await get('/api/employees/E100006')).body.data.jobTitle).toBe(
      'Managing Director, Wealth Management',
    );
    await request(app).post('/api/_admin/reset').set('X-API-Key', API_KEY).expect(200);
    expect((await get('/api/employees/E100006')).body.data.jobTitle).toBe(
      'Head of Wealth Management',
    );
  });

  it('serves attendance and leave for a date range in its own schema', async () => {
    const attendance = await get(
      '/api/attendance?from=2026-08-10&to=2026-08-10&pageSize=500',
    ).expect(200);
    expect(attendance.body.total).toBeGreaterThan(40);
    for (const record of attendance.body.data) {
      expect(sgAttendanceSchema.safeParse(record).success).toBe(true);
      expect(record.status).toBe('Public Holiday');
    }
    const leave = await get('/api/leave?from=2026-07-01&to=2026-09-30&pageSize=500').expect(200);
    expect(leave.body.total).toBeGreaterThan(10);
    expect(leave.body.data.every((l: unknown) => sgLeaveSchema.safeParse(l).success)).toBe(true);
    await get('/api/attendance?from=2026-09-30&to=2026-07-01').expect(400);
    const types = await get('/api/leave-types').expect(200);
    expect(types.body.data).toContainEqual({ code: 'TOIL', name: 'Time-off in Lieu' });
  });

  it('answers unknown employees, unknown endpoints and malformed JSON with errors', async () => {
    await get('/api/employees/E000000').expect(404);
    await get('/api/unknown').expect(404);
    await request(app)
      .post('/api/employees')
      .set('X-API-Key', API_KEY)
      .set('Content-Type', 'application/json')
      .send('{not json')
      .expect(400);
  });
});

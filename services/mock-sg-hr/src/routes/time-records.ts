import { Router } from 'express';

import type { SgHrStore } from '../data/store.js';
import { paginate } from '../http/paginate.js';
import { dateRangeQuerySchema } from '../schemas/queries.js';
import { SG_LEAVE_TYPES } from '../schemas/sg-records.js';

/** Attendance, leave and leave-type endpoints (read-only). */
export function timeRecordRoutes(store: SgHrStore): Router {
  const router = Router();

  router.get('/api/leave-types', (_req, res) => {
    res.json({ data: SG_LEAVE_TYPES });
  });

  router.get('/api/attendance', (req, res) => {
    const query = dateRangeQuerySchema.parse(req.query);
    res.json(paginate(store.attendanceBetween(query.from, query.to), query.page, query.pageSize));
  });

  router.get('/api/leave', (req, res) => {
    const query = dateRangeQuerySchema.parse(req.query);
    res.json(paginate(store.leaveBetween(query.from, query.to), query.page, query.pageSize));
  });

  return router;
}

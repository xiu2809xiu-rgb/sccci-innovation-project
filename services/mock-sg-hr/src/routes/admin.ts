import { Router } from 'express';

import type { SgHrStore } from '../data/store.js';
import { sgEmployeePatchSchema } from '../schemas/sg-records.js';

/**
 * Demo controls: simulate a change made directly in SG HR (so the next sync
 * picks it up) and restore the generated dataset.
 */
export function adminRoutes(store: SgHrStore): Router {
  const router = Router();

  router.post('/api/_admin/employees/:employeeNo/update', (req, res) => {
    const patch = sgEmployeePatchSchema.parse(req.body);
    res.json({ data: store.updateEmployee(req.params.employeeNo, patch) });
  });

  router.post('/api/_admin/reset', (_req, res) => {
    store.reset();
    res.json({ data: { reset: true, employees: store.listEmployees().length } });
  });

  return router;
}

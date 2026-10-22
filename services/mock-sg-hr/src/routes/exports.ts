import { Router, type Response } from 'express';

import type { SgHrStore } from '../data/store.js';
import { employeesExport, leaveExport, payrollExport } from '../exports/infotech-exports.js';
import { exportRangeQuerySchema, payrollQuerySchema } from '../schemas/queries.js';

function sendCsv(res: Response, fileName: string, csv: string): void {
  res.attachment(fileName);
  res.type('text/csv; charset=utf-8');
  res.send(csv);
}

/**
 * INFO-TECH-style exports: the spreadsheet files HR downloads, one per dataset,
 * with English headers and Singapore dates. They come from the same records as
 * the API, so an export and a sync describe the same people.
 */
export function exportRoutes(store: SgHrStore): Router {
  const router = Router();

  router.get('/api/exports/employees.csv', (_req, res) => {
    sendCsv(res, 'employees.csv', employeesExport(store));
  });

  router.get('/api/exports/leave.csv', (req, res) => {
    const query = exportRangeQuerySchema.parse(req.query);
    sendCsv(res, `leave_${query.from}_${query.to}.csv`, leaveExport(store, query.from, query.to));
  });

  router.get('/api/exports/payroll.csv', (req, res) => {
    const query = payrollQuerySchema.parse(req.query);
    sendCsv(res, `payroll_${query.month}.csv`, payrollExport(store, query.month));
  });

  return router;
}

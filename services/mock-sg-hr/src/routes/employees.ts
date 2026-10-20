import { Router } from 'express';

import type { SgHrStore } from '../data/store.js';
import { HttpError } from '../http/errors.js';
import { paginate } from '../http/paginate.js';
import { employeeListQuerySchema } from '../schemas/queries.js';
import { sgEmployeeCreateSchema, sgEmployeePatchSchema } from '../schemas/sg-records.js';

/** Employee master endpoints. */
export function employeeRoutes(store: SgHrStore): Router {
  const router = Router();

  router.get('/api/employees', (req, res) => {
    const query = employeeListQuerySchema.parse(req.query);
    res.json(paginate(store.listEmployees(query.updatedSince), query.page, query.pageSize));
  });

  router.get('/api/employees/:employeeNo', (req, res) => {
    const employee = store.getEmployee(req.params.employeeNo);
    if (!employee) {
      throw new HttpError(404, 'not_found', `Employee ${req.params.employeeNo} not found`);
    }
    res.json({ data: employee });
  });

  router.post('/api/employees', (req, res) => {
    const input = sgEmployeeCreateSchema.parse(req.body);
    res.status(201).json({ data: store.createEmployee(input) });
  });

  router.patch('/api/employees/:employeeNo', (req, res) => {
    const patch = sgEmployeePatchSchema.parse(req.body);
    res.json({ data: store.updateEmployee(req.params.employeeNo, patch) });
  });

  return router;
}

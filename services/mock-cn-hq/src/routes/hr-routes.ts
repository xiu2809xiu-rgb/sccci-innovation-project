import { Router } from 'express';

import { renderOrgUnits } from '../data/render.js';
import type { CnHqStore } from '../data/store.js';
import { ok, page } from '../http/envelope.js';
import { HttpError } from '../http/errors.js';
import { compactDateRangeSchema, odataPageSchema } from '../schemas/queries.js';
import { CN_LEAVE_TYPES, cnEmployeePatchSchema } from '../schemas/cn-records.js';

const BASE = '/sap/opu/hr';

/** HQ's SAP-like HR endpoints: employees, organisation, attendance, leave and demo controls. */
export function hrRoutes(store: CnHqStore): Router {
  const router = Router();

  router.get(`${BASE}/employees`, (req, res) => {
    const query = odataPageSchema.parse(req.query);
    res.json(page(store.listEmployees(), query.$top, query.$skip));
  });

  router.get(`${BASE}/employees/:employeeNo`, (req, res) => {
    const employee = store.getEmployee(req.params.employeeNo);
    if (!employee) {
      throw new HttpError(404, 'E404', '员工不存在');
    }
    res.json(ok(employee));
  });

  router.get(`${BASE}/org-units`, (_req, res) => {
    const units = renderOrgUnits();
    res.json(page(units, units.length, 0));
  });

  router.get(`${BASE}/leave-types`, (_req, res) => {
    res.json(page(CN_LEAVE_TYPES, CN_LEAVE_TYPES.length, 0));
  });

  router.get(`${BASE}/attendance`, (req, res) => {
    const query = compactDateRangeSchema.parse(req.query);
    res.json(
      page(store.attendanceBetween(query.beginDate, query.endDate), query.$top, query.$skip),
    );
  });

  router.get(`${BASE}/leave`, (req, res) => {
    const query = compactDateRangeSchema.parse(req.query);
    res.json(page(store.leaveBetween(query.beginDate, query.endDate), query.$top, query.$skip));
  });

  router.post(`${BASE}/_admin/employees/:employeeNo/update`, (req, res) => {
    const patch = cnEmployeePatchSchema.parse(req.body);
    res.json(ok(store.updateEmployee(req.params.employeeNo, patch)));
  });

  router.post(`${BASE}/_admin/reset`, (_req, res) => {
    store.reset();
    res.json(ok({ 已重置: true, 员工数: store.listEmployees().length }));
  });

  return router;
}

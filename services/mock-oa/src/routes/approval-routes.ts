import { Router } from 'express';

import type { ApprovalEngine } from '../engine/approval-engine.js';
import { ok, page } from '../http/envelope.js';
import {
  approvalActionSchema,
  approvalListQuerySchema,
  createApprovalSchema,
} from '../schemas/oa-records.js';

const BASE = '/openapi/v1/approvals';

/** Approval requests: list, read, raise and act on them. */
export function approvalRoutes(engine: ApprovalEngine): Router {
  const router = Router();

  router.get(BASE, (req, res) => {
    const query = approvalListQuerySchema.parse(req.query);
    res.json(page(engine.list({ type: query.type, status: query.status }), query.page, query.size));
  });

  router.get(`${BASE}/:requestId`, (req, res) => {
    res.json(ok(engine.get(req.params.requestId)));
  });

  router.post(BASE, (req, res) => {
    res.status(201).json(ok(engine.create(createApprovalSchema.parse(req.body))));
  });

  router.post(`${BASE}/:requestId/actions`, (req, res) => {
    res.json(ok(engine.act(req.params.requestId, approvalActionSchema.parse(req.body))));
  });

  return router;
}

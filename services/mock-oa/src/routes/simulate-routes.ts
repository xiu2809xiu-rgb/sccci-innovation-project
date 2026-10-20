import { Router } from 'express';

import type { ApprovalEngine } from '../engine/approval-engine.js';
import { ok } from '../http/envelope.js';
import { simulateManpowerSchema } from '../schemas/oa-records.js';

const DAY_MS = 86_400_000;

/**
 * Demo shortcut: Arjun Menon raises a Wealth Management manpower request and
 * every node approves it at once, so OA emits `approval.completed` immediately.
 */
export function simulateRoutes(engine: ApprovalEngine, clock: () => Date): Router {
  const router = Router();

  router.post('/openapi/v1/_simulate/manpower-request', (req, res) => {
    const overrides = simulateManpowerSchema.parse(req.body ?? {});
    const headcount = overrides.headcount ?? 1;
    const startDate =
      overrides.startDate ?? new Date(clock().getTime() + 45 * DAY_MS).toISOString().slice(0, 10);
    const created = engine.create({
      type: 'MANPOWER_REQUEST',
      title: overrides.title ?? `Wealth Management: ${String(headcount)} x Relationship Manager`,
      applicantEmployeeNo: 'E100006',
      formData: {
        申请部门: '财富管理部',
        部门代码: 'WM',
        岗位名称: '客户经理',
        岗位英文名称: 'Relationship Manager',
        需求人数: headcount,
        工作地点: '新加坡',
        期望到岗日期: startDate,
        用工类型: '正式',
        预算月薪下限: 7000,
        预算月薪上限: 9000,
        币种: 'SGD',
        申请理由: '新加坡高净值客户资产增长，需扩充客户经理团队',
        法人公司: 'SG01',
      },
    });
    res.status(201).json(ok(engine.approveAll(created.requestId)));
  });

  return router;
}

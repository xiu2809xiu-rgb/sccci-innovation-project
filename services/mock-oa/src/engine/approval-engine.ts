import {
  generateApprovals,
  generateWorkforce,
  oaDisplayName,
  planApprovalChain,
  type Workforce,
} from '@huitong/synthetic-data';

import { renderApproval, renderStep, WORKFLOW_NAMES } from '../data/render.js';
import { HttpError } from '../http/errors.js';
import type {
  ApprovalActionInput,
  CreateApprovalInput,
  OaApproval,
} from '../schemas/oa-records.js';

export type CompletionListener = (approval: OaApproval) => void;

interface ListFilter {
  type?: OaApproval['type'] | undefined;
  status?: OaApproval['status'] | undefined;
}

/**
 * The OA approval engine: requests move through a fixed chain of nodes. The
 * request completes when the last node approves or any node rejects, and every
 * completion is reported to the listener (the webhook dispatcher).
 */
export class ApprovalEngine {
  private readonly workforce: Workforce = generateWorkforce();
  private approvals = new Map<string, OaApproval>();
  private sequence = 0;

  constructor(
    private readonly onCompleted: CompletionListener,
    private readonly clock: () => Date = () => new Date(),
  ) {
    this.reset();
  }

  reset(): void {
    const seeded = generateApprovals(this.workforce).map((approval) =>
      renderApproval(approval, this.employee(approval.applicantEmployeeNo)),
    );
    this.approvals = new Map(seeded.map((a) => [a.requestId, structuredClone(a)]));
    this.sequence = Math.max(...seeded.map((a) => Number(a.requestId.slice(-6))));
  }

  /** Newest first, optionally filtered by type and status. */
  list(filter: ListFilter): OaApproval[] {
    return [...this.approvals.values()]
      .filter(
        (a) =>
          (filter.type === undefined || a.type === filter.type) &&
          (filter.status === undefined || a.status === filter.status),
      )
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  get(requestId: string): OaApproval {
    const approval = this.approvals.get(requestId);
    if (!approval) {
      throw new HttpError(404, 40400, 'request not found');
    }
    return approval;
  }

  create(input: CreateApprovalInput): OaApproval {
    const applicant = this.employee(input.applicantEmployeeNo);
    const submittedAt = this.now();
    this.sequence += 1;
    const approval: OaApproval = {
      requestId: `OA-2026-${String(this.sequence).padStart(6, '0')}`,
      type: input.type,
      workflowName: WORKFLOW_NAMES[input.type],
      title: input.title,
      status: 'PENDING',
      applicant: {
        employeeNo: applicant.employeeNo,
        name: oaDisplayName(applicant),
        departmentCode: applicant.departmentCode,
      },
      entityCode: applicant.entityCode,
      submittedAt,
      completedAt: null,
      formData: { ...input.formData },
      approvalChain: planApprovalChain(
        this.workforce,
        input.type,
        applicant.employeeNo,
        submittedAt,
      ).map(renderStep),
    };
    this.approvals.set(approval.requestId, approval);
    return approval;
  }

  /** Applies an approve or reject action to the current (first pending) node. */
  act(requestId: string, input: ApprovalActionInput): OaApproval {
    const approval = this.get(requestId);
    if (approval.status !== 'PENDING') {
      throw new HttpError(409, 40900, 'request already completed');
    }
    const step = approval.approvalChain.find((s) => s.action === 'PENDING');
    if (!step) {
      throw new HttpError(409, 40900, 'no pending approval node');
    }
    const at = this.now();
    step.action = input.action;
    step.approver = input.approver;
    step.at = at;
    step.comment = input.comment ?? (input.action === 'APPROVE' ? '同意' : null);

    const finished =
      input.action === 'REJECT' || !approval.approvalChain.some((s) => s.action === 'PENDING');
    if (finished) {
      if (input.action === 'REJECT') {
        // Later nodes are never reached once a node rejects.
        approval.approvalChain = approval.approvalChain.filter((s) => s.action !== 'PENDING');
      }
      approval.status = input.action === 'REJECT' ? 'REJECTED' : 'APPROVED';
      approval.completedAt = at;
      this.onCompleted(structuredClone(approval));
    }
    return approval;
  }

  /** Approves every remaining node with its planned approver (demo shortcut). */
  approveAll(requestId: string): OaApproval {
    let approval = this.get(requestId);
    for (
      let step = approval.approvalChain.find((s) => s.action === 'PENDING');
      step;
      step = approval.approvalChain.find((s) => s.action === 'PENDING')
    ) {
      approval = this.act(requestId, { action: 'APPROVE', approver: step.approver });
    }
    return approval;
  }

  private employee(employeeNo: string) {
    const employee = this.workforce.employees.find((e) => e.employeeNo === employeeNo);
    if (!employee) {
      throw new HttpError(400, 40001, `unknown employee ${employeeNo}`);
    }
    return employee;
  }

  private now(): string {
    return this.clock()
      .toISOString()
      .replace(/\.\d{3}Z$/, 'Z');
  }
}

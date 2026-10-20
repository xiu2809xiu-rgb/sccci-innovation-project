import {
  oaDisplayName,
  type ApprovalStep,
  type ApprovalType,
  type SyntheticApproval,
  type SyntheticEmployee,
} from '@huitong/synthetic-data';

import type { OaApproval, OaApprovalStep } from '../schemas/oa-records.js';

/** The bilingual workflow names shown in the OA product. */
export const WORKFLOW_NAMES: Readonly<Record<ApprovalType, string>> = {
  MANPOWER_REQUEST: '人员需求申请 / Manpower Request',
  OFFICE_RENTAL: '办公室租赁申请 / Office Rental',
  EXPENSE_CLAIM: '费用报销 / Expense Claim',
  IT_ASSET_PURCHASE: 'IT 资产采购 / IT Asset Purchase',
  PAYMENT_APPROVAL: '付款审批 / Payment Approval',
};

export function renderStep(step: ApprovalStep): OaApprovalStep {
  return {
    node: step.node,
    approver: step.approverName,
    action: step.action,
    at: step.at,
    comment: step.comment,
  };
}

/** Renders a synthetic request into the OA platform's schema. */
export function renderApproval(
  approval: SyntheticApproval,
  applicant: SyntheticEmployee,
): OaApproval {
  return {
    requestId: approval.requestId,
    type: approval.type,
    workflowName: WORKFLOW_NAMES[approval.type],
    title: approval.title,
    status: approval.status,
    applicant: {
      employeeNo: applicant.employeeNo,
      name: oaDisplayName(applicant),
      departmentCode: applicant.departmentCode,
    },
    entityCode: approval.entityCode,
    submittedAt: approval.submittedAt,
    completedAt: approval.completedAt,
    formData: { ...approval.formData },
    approvalChain: approval.chain.map(renderStep),
  };
}

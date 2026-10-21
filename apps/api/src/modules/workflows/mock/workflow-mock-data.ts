import type {
  ApprovalDecision,
  EntityCode,
  NotificationChannel,
  Role,
  SlaState,
  WorkflowDraftRecord,
  WorkflowInstanceStatus,
  WorkflowPerson,
  WorkflowSource,
  WorkflowTaskStatus,
  WorkflowTimelineItem,
  WorkflowTimelineType,
} from '@huitong/shared';

/**
 * Typed sample data for area 2's head start, as of 21 Oct 2026. It follows
 * the synthetic OA requests that mock-oa serves (OA-2026-000101 to 000103,
 * their approvers and dates) and the synthetic workforce's employee numbers,
 * so the board tells the same story as the rest of the demo. Synthetic demo
 * data only.
 */
export interface MockStep {
  status: WorkflowTaskStatus;
  createdAt: string;
  dueAt: string;
  completedAt?: string;
  completedBy?: WorkflowPerson;
  assignee?: WorkflowPerson;
  /** As of the sample's date. */
  sla: SlaState;
}

export interface MockInstance {
  id: string;
  title: string;
  entityCode: EntityCode;
  status: WorkflowInstanceStatus;
  source: WorkflowSource;
  requestedBy: WorkflowPerson;
  headcount: number;
  expectedStartDate: string;
  startedAt: string;
  completedAt: string | null;
  /** By step key; a step that has not started has no entry. */
  steps: Partial<Record<string, MockStep>>;
  approvalChain: ApprovalDecision[];
  draftRecord: WorkflowDraftRecord | null;
  timeline: Omit<WorkflowTimelineItem, 'id'>[];
}

const PEOPLE = {
  tanMeiLing: { employeeNo: 'E100003', name: 'Tan Mei Ling' },
  arjunMenon: { employeeNo: 'E100006', name: 'Arjun Menon' },
  nurAisyah: { employeeNo: 'E100007', name: 'Nur Aisyah' },
  yeoChengZe: { employeeNo: 'E100026', name: 'Yeo Cheng Ze' },
  wongYongKang: { employeeNo: 'E100032', name: 'Wong Yong Kang' },
} satisfies Record<string, WorkflowPerson>;

/** The OA approval chain for a Singapore manpower request (mock-oa's chain). */
function oaChain(applicant: string, at: readonly [string, string, string, string]) {
  const [submitted, head, hr, hq] = at;
  return [
    { node: '发起申请', approverName: applicant, action: 'SUBMIT', at: submitted, comment: null },
    {
      node: '部门负责人审批',
      approverName: 'Lim Wei Jie',
      action: 'APPROVE',
      at: head,
      comment: '同意',
    },
    { node: 'HR审核', approverName: 'Tan Mei Ling', action: 'APPROVE', at: hr, comment: '同意' },
    { node: '总部审批', approverName: '周欣怡', action: 'APPROVE', at: hq, comment: '同意' },
  ] satisfies ApprovalDecision[];
}

interface EventOptions {
  stepKey?: string;
  actor?: { person: WorkflowPerson; role: Role };
  channel?: NotificationChannel;
}

function event(
  type: WorkflowTimelineType,
  occurredAt: string,
  { stepKey, actor, channel }: EventOptions = {},
): Omit<WorkflowTimelineItem, 'id'> {
  return {
    type,
    occurredAt,
    stepKey: stepKey ?? null,
    actor: actor ? { name: actor.person.name, role: actor.role } : null,
    channel: channel ?? null,
  };
}

const teams = (stepKey: string, occurredAt: string) =>
  event('notification.sent', occurredAt, { stepKey, channel: 'TEAMS' });
const hrSg = (person: WorkflowPerson) => ({ person, role: 'HR_SG' as const });
const hiringManager = (person: WorkflowPerson) => ({ person, role: 'HIRING_MANAGER' as const });
const adminOps = (person: WorkflowPerson) => ({ person, role: 'ADMIN_OPS' as const });

const oa = (requestId: string, approvedAt: string): WorkflowSource => ({
  connectorId: 'oa',
  requestId,
  requestType: 'MANPOWER_REQUEST',
  approvedAt,
});

/** Two relationship managers: recruitment is past its SLA and has been escalated. */
const WEALTH_MANAGEMENT: MockInstance = {
  id: '0199183f-56a8-7c21-8a4e-1f0c9b2d3e41',
  title: 'Wealth Management: 2 x Relationship Manager',
  entityCode: 'SG01',
  status: 'RUNNING',
  source: oa('OA-2026-000101', '2026-09-05T03:22:00Z'),
  requestedBy: PEOPLE.arjunMenon,
  headcount: 2,
  expectedStartDate: '2026-12-01',
  startedAt: '2026-09-05T03:22:30Z',
  completedAt: null,
  steps: {
    requisition: {
      status: 'DONE',
      createdAt: '2026-09-05T03:22:30Z',
      dueAt: '2026-09-06T03:22:30Z',
      completedAt: '2026-09-05T08:10:00Z',
      completedBy: PEOPLE.tanMeiLing,
      sla: 'ON_TRACK',
    },
    recruit: {
      status: 'IN_PROGRESS',
      createdAt: '2026-09-05T08:10:00Z',
      dueAt: '2026-10-05T08:10:00Z',
      assignee: PEOPLE.arjunMenon,
      sla: 'OVERDUE',
    },
  },
  approvalChain: oaChain('Arjun Menon', [
    '2026-09-01T02:15:00Z',
    '2026-09-03T01:40:00Z',
    '2026-09-04T05:36:00Z',
    '2026-09-05T03:22:00Z',
  ]),
  draftRecord: null,
  timeline: [
    event('instance.started', '2026-09-05T03:22:30Z'),
    event('task.created', '2026-09-05T03:22:30Z', { stepKey: 'requisition' }),
    teams('requisition', '2026-09-05T03:22:31Z'),
    event('task.completed', '2026-09-05T08:10:00Z', {
      stepKey: 'requisition',
      actor: hrSg(PEOPLE.tanMeiLing),
    }),
    event('task.created', '2026-09-05T08:10:00Z', { stepKey: 'recruit' }),
    teams('recruit', '2026-09-05T08:10:01Z'),
    event('sla.reminder', '2026-09-29T08:10:00Z', { stepKey: 'recruit' }),
    teams('recruit', '2026-09-29T08:10:01Z'),
    event('sla.escalation', '2026-10-05T08:10:00Z', { stepKey: 'recruit' }),
    teams('recruit', '2026-10-05T08:10:01Z'),
  ],
};

/** A software engineer: hired, the draft record exists, and admin preparation is under way. */
const TECHNOLOGY: MockInstance = {
  id: '0198d6e2-1b40-7f63-9d15-6a2e4c8b7f02',
  title: 'Technology: 1 x Software Engineer',
  entityCode: 'SG01',
  status: 'RUNNING',
  source: oa('OA-2026-000102', '2026-08-23T08:36:00Z'),
  requestedBy: PEOPLE.yeoChengZe,
  headcount: 1,
  expectedStartDate: '2026-11-16',
  startedAt: '2026-08-23T08:36:30Z',
  completedAt: null,
  steps: {
    requisition: {
      status: 'DONE',
      createdAt: '2026-08-23T08:36:30Z',
      dueAt: '2026-08-24T08:36:30Z',
      completedAt: '2026-08-24T02:05:00Z',
      completedBy: PEOPLE.tanMeiLing,
      sla: 'ON_TRACK',
    },
    recruit: {
      status: 'DONE',
      createdAt: '2026-08-24T02:05:00Z',
      dueAt: '2026-09-23T02:05:00Z',
      completedAt: '2026-10-15T09:30:00Z',
      completedBy: PEOPLE.yeoChengZe,
      sla: 'ON_TRACK',
    },
    offer: {
      status: 'DONE',
      createdAt: '2026-10-15T09:30:00Z',
      dueAt: '2026-10-17T09:30:00Z',
      completedAt: '2026-10-16T05:10:00Z',
      completedBy: PEOPLE.tanMeiLing,
      sla: 'ON_TRACK',
    },
    'employee-record': {
      status: 'DONE',
      createdAt: '2026-10-16T05:10:00Z',
      dueAt: '2026-10-17T05:10:00Z',
      completedAt: '2026-10-16T08:40:00Z',
      completedBy: PEOPLE.tanMeiLing,
      sla: 'ON_TRACK',
    },
    laptop: {
      status: 'DONE',
      createdAt: '2026-10-16T08:40:00Z',
      dueAt: '2026-10-19T08:40:00Z',
      completedAt: '2026-10-19T02:15:00Z',
      completedBy: PEOPLE.nurAisyah,
      sla: 'ON_TRACK',
    },
    desk: {
      status: 'IN_PROGRESS',
      createdAt: '2026-10-19T02:15:00Z',
      dueAt: '2026-10-22T02:15:00Z',
      assignee: PEOPLE.nurAisyah,
      sla: 'DUE_SOON',
    },
  },
  approvalChain: oaChain('Yeo Cheng Ze', [
    '2026-08-18T03:00:00Z',
    '2026-08-20T08:34:00Z',
    '2026-08-21T07:41:00Z',
    '2026-08-23T08:36:00Z',
  ]),
  // Not yet in the master: drafts arrive with story B-6, so this number is part of the sample.
  draftRecord: { employeeNo: 'E100121', status: 'PRE_HIRE' },
  timeline: [
    event('instance.started', '2026-08-23T08:36:30Z'),
    event('task.created', '2026-08-23T08:36:30Z', { stepKey: 'requisition' }),
    teams('requisition', '2026-08-23T08:36:31Z'),
    event('task.completed', '2026-08-24T02:05:00Z', {
      stepKey: 'requisition',
      actor: hrSg(PEOPLE.tanMeiLing),
    }),
    event('task.created', '2026-08-24T02:05:00Z', { stepKey: 'recruit' }),
    teams('recruit', '2026-08-24T02:05:01Z'),
    event('sla.reminder', '2026-09-17T02:05:00Z', { stepKey: 'recruit' }),
    event('sla.escalation', '2026-09-23T02:05:00Z', { stepKey: 'recruit' }),
    teams('recruit', '2026-09-23T02:05:01Z'),
    event('task.completed', '2026-10-15T09:30:00Z', {
      stepKey: 'recruit',
      actor: hiringManager(PEOPLE.yeoChengZe),
    }),
    event('task.created', '2026-10-15T09:30:00Z', { stepKey: 'offer' }),
    event('task.completed', '2026-10-16T05:10:00Z', {
      stepKey: 'offer',
      actor: hrSg(PEOPLE.tanMeiLing),
    }),
    event('task.created', '2026-10-16T05:10:00Z', { stepKey: 'employee-record' }),
    event('record.draft_created', '2026-10-16T08:40:00Z', { stepKey: 'employee-record' }),
    event('task.completed', '2026-10-16T08:40:00Z', {
      stepKey: 'employee-record',
      actor: hrSg(PEOPLE.tanMeiLing),
    }),
    event('task.created', '2026-10-16T08:40:00Z', { stepKey: 'laptop' }),
    teams('laptop', '2026-10-16T08:40:01Z'),
    event('task.completed', '2026-10-19T02:15:00Z', {
      stepKey: 'laptop',
      actor: adminOps(PEOPLE.nurAisyah),
    }),
    event('task.created', '2026-10-19T02:15:00Z', { stepKey: 'desk' }),
    teams('desk', '2026-10-19T02:15:01Z'),
  ],
};

/** An AML analyst: the requisition is open and recruitment is on track. */
const COMPLIANCE: MockInstance = {
  id: '01998a1c-3c90-7b84-a6f2-0d4e5b7c9a13',
  title: 'Compliance: 1 x AML Analyst',
  entityCode: 'SG01',
  status: 'RUNNING',
  source: oa('OA-2026-000103', '2026-09-26T06:16:00Z'),
  requestedBy: PEOPLE.wongYongKang,
  headcount: 1,
  expectedStartDate: '2027-01-04',
  startedAt: '2026-09-26T06:16:30Z',
  completedAt: null,
  steps: {
    requisition: {
      status: 'DONE',
      createdAt: '2026-09-26T06:16:30Z',
      dueAt: '2026-09-27T06:16:30Z',
      completedAt: '2026-09-26T08:40:00Z',
      completedBy: PEOPLE.tanMeiLing,
      sla: 'ON_TRACK',
    },
    recruit: {
      status: 'IN_PROGRESS',
      createdAt: '2026-09-26T08:40:00Z',
      dueAt: '2026-10-26T08:40:00Z',
      assignee: PEOPLE.wongYongKang,
      sla: 'ON_TRACK',
    },
  },
  approvalChain: oaChain('Wong Yong Kang', [
    '2026-09-22T01:40:00Z',
    '2026-09-23T08:51:00Z',
    '2026-09-24T09:55:00Z',
    '2026-09-26T06:16:00Z',
  ]),
  draftRecord: null,
  timeline: [
    event('instance.started', '2026-09-26T06:16:30Z'),
    event('task.created', '2026-09-26T06:16:30Z', { stepKey: 'requisition' }),
    teams('requisition', '2026-09-26T06:16:31Z'),
    event('task.completed', '2026-09-26T08:40:00Z', {
      stepKey: 'requisition',
      actor: hrSg(PEOPLE.tanMeiLing),
    }),
    event('task.created', '2026-09-26T08:40:00Z', { stepKey: 'recruit' }),
    teams('recruit', '2026-09-26T08:40:01Z'),
  ],
};

/** Newest first. */
export const MOCK_WORKFLOW_INSTANCES: readonly MockInstance[] = [
  COMPLIANCE,
  WEALTH_MANAGEMENT,
  TECHNOLOGY,
];

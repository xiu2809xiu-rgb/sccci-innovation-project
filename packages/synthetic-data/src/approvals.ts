import { addDays } from './dates.js';
import { SeededRandom } from './prng.js';
import { departmentByCode, SYNTHETIC_SEED, workLocationByCode } from './reference-data.js';
import type {
  ApprovalStatus,
  ApprovalStep,
  ApprovalType,
  DepartmentCode,
  EntityCode,
  SyntheticApproval,
  SyntheticEmployee,
  Workforce,
} from './types.js';

/** Approval nodes per request type, after the applicant's SUBMIT step. */
export const APPROVAL_CHAINS: Readonly<Record<ApprovalType, readonly string[]>> = {
  MANPOWER_REQUEST: ['部门负责人审批', 'HR审核', '总部审批'],
  EXPENSE_CLAIM: ['部门负责人审批', '财务审核'],
  IT_ASSET_PURCHASE: ['部门负责人审批', 'IT审核', '财务审核'],
  OFFICE_RENTAL: ['行政审核', '财务审核', '总部审批'],
  PAYMENT_APPROVAL: ['财务审核', '总部审批'],
};

type ApplicantRef =
  string | { head: [EntityCode, DepartmentCode] } | { staff: [EntityCode, DepartmentCode, number] };

interface ApprovalSpec {
  type: ApprovalType;
  entity: EntityCode;
  applicant: ApplicantRef;
  title: string;
  submittedAt: string;
  status: ApprovalStatus;
  /** How many approval nodes have acted (approve or reject). */
  nodesActed: number;
  formData: Record<string, string | number>;
  finalComment?: string;
}

function manpower(
  code: DepartmentCode,
  entity: EntityCode,
  titleZh: string,
  titleEn: string,
  headcount: number,
  location: 'SG-SIN' | 'CN-SHA' | 'CN-PEK' | 'CN-SZX',
  startDate: string,
  salary: [number, number],
  reason: string,
): Record<string, string | number> {
  return {
    申请部门: departmentByCode(code).nameZh,
    部门代码: code,
    岗位名称: titleZh,
    岗位英文名称: titleEn,
    需求人数: headcount,
    工作地点: workLocationByCode(location).nameZh,
    期望到岗日期: startDate,
    用工类型: '正式',
    预算月薪下限: salary[0],
    预算月薪上限: salary[1],
    币种: entity === 'SG01' ? 'SGD' : 'CNY',
    申请理由: reason,
    法人公司: entity,
  };
}

/** The 25 OA requests behind the demo: manpower requests, claims, purchases, rentals and payments. */
const SPECS: readonly ApprovalSpec[] = [
  {
    type: 'MANPOWER_REQUEST',
    entity: 'SG01',
    applicant: 'E100006',
    title: 'Wealth Management: 2 x Relationship Manager',
    submittedAt: '2026-09-01T02:15:00Z',
    status: 'APPROVED',
    nodesActed: 3,
    formData: manpower(
      'WM',
      'SG01',
      '客户经理',
      'Relationship Manager',
      2,
      'SG-SIN',
      '2026-12-01',
      [7000, 9000],
      '新加坡高净值客户资产增长，需扩充客户经理团队以维持服务水平',
    ),
  },
  {
    type: 'MANPOWER_REQUEST',
    entity: 'SG01',
    applicant: { head: ['SG01', 'IT'] },
    title: 'Technology: 1 x Software Engineer',
    submittedAt: '2026-08-18T03:00:00Z',
    status: 'APPROVED',
    nodesActed: 3,
    formData: manpower(
      'IT',
      'SG01',
      '软件工程师',
      'Software Engineer',
      1,
      'SG-SIN',
      '2026-11-16',
      [6500, 8500],
      '支持集成平台与内部系统的开发和维护',
    ),
  },
  {
    type: 'MANPOWER_REQUEST',
    entity: 'SG01',
    applicant: { head: ['SG01', 'COMP'] },
    title: 'Compliance: 1 x AML Analyst',
    submittedAt: '2026-09-22T01:40:00Z',
    status: 'APPROVED',
    nodesActed: 3,
    formData: manpower(
      'COMP',
      'SG01',
      '反洗钱分析师',
      'AML Analyst',
      1,
      'SG-SIN',
      '2027-01-04',
      [5000, 6200],
      '反洗钱交易监测工作量持续增加',
    ),
  },
  {
    type: 'MANPOWER_REQUEST',
    entity: 'SG01',
    applicant: { head: ['SG01', 'OPS'] },
    title: 'Operations: 1 x Operations Executive',
    submittedAt: '2026-10-12T02:30:00Z',
    status: 'PENDING',
    nodesActed: 1,
    formData: manpower(
      'OPS',
      'SG01',
      '运营专员',
      'Operations Executive',
      1,
      'SG-SIN',
      '2027-01-11',
      [4500, 5500],
      '交易量增长，清算团队人手不足',
    ),
  },
  {
    type: 'MANPOWER_REQUEST',
    entity: 'CN01',
    applicant: { head: ['CN01', 'IT'] },
    title: '信息技术部：2 × 数据工程师',
    submittedAt: '2026-10-14T01:20:00Z',
    status: 'PENDING',
    nodesActed: 0,
    formData: manpower(
      'IT',
      'CN01',
      '数据工程师',
      'Data Engineer',
      2,
      'CN-SHA',
      '2026-12-15',
      [22000, 30000],
      '建设集团数据中台，支持跨境数据整合',
    ),
  },
  {
    type: 'MANPOWER_REQUEST',
    entity: 'CN01',
    applicant: { head: ['CN01', 'RISK'] },
    title: '风险管理部：1 × 市场风险分析师',
    submittedAt: '2026-08-25T02:05:00Z',
    status: 'REJECTED',
    nodesActed: 3,
    formData: manpower(
      'RISK',
      'CN01',
      '市场风险分析师',
      'Market Risk Analyst',
      1,
      'CN-PEK',
      '2026-11-02',
      [16000, 22000],
      '市场风险模型复核工作量增加',
    ),
    finalComment: '2026年下半年编制冻结，明年一季度再议',
  },
  {
    type: 'MANPOWER_REQUEST',
    entity: 'CN01',
    applicant: { head: ['CN01', 'CB'] },
    title: '公司金融部：1 × 信贷分析师',
    submittedAt: '2026-08-10T02:45:00Z',
    status: 'APPROVED',
    nodesActed: 3,
    formData: manpower(
      'CB',
      'CN01',
      '信贷分析师',
      'Credit Analyst',
      1,
      'CN-SZX',
      '2026-10-19',
      [15000, 21000],
      '深圳分部企业客户授信业务扩展',
    ),
  },
  {
    type: 'MANPOWER_REQUEST',
    entity: 'SG01',
    applicant: { head: ['SG01', 'FIN'] },
    title: 'Finance: 1 x Treasury Analyst',
    submittedAt: '2026-09-08T03:10:00Z',
    status: 'WITHDRAWN',
    nodesActed: 1,
    formData: manpower(
      'FIN',
      'SG01',
      '资金分析师',
      'Treasury Analyst',
      1,
      'SG-SIN',
      '2026-12-01',
      [5600, 7200],
      '资金管理岗位空缺',
    ),
    finalComment: 'Role covered by an internal transfer',
  },
  {
    type: 'EXPENSE_CLAIM',
    entity: 'SG01',
    applicant: { staff: ['SG01', 'WM', 1] },
    title: 'Client event: Q3 wealth seminar',
    submittedAt: '2026-09-15T04:00:00Z',
    status: 'APPROVED',
    nodesActed: 2,
    formData: {
      报销金额: 1280.5,
      币种: 'SGD',
      费用类别: '业务招待费',
      报销事由: '第三季度财富管理客户研讨会餐饮',
      发生日期: '2026-09-10',
    },
  },
  {
    type: 'EXPENSE_CLAIM',
    entity: 'CN01',
    applicant: { staff: ['CN01', 'FIN', 1] },
    title: '出差北京：审计沟通',
    submittedAt: '2026-08-21T02:00:00Z',
    status: 'APPROVED',
    nodesActed: 2,
    formData: {
      报销金额: 3460,
      币种: 'CNY',
      费用类别: '差旅费',
      报销事由: '赴北京与外部审计沟通年中审阅',
      发生日期: '2026-08-17',
    },
  },
  {
    type: 'EXPENSE_CLAIM',
    entity: 'SG01',
    applicant: 'E100003',
    title: 'Training: PDPA refresher course',
    submittedAt: '2026-08-05T01:30:00Z',
    status: 'APPROVED',
    nodesActed: 2,
    formData: {
      报销金额: 450,
      币种: 'SGD',
      费用类别: '培训费',
      报销事由: '个人资料保护法 (PDPA) 进修课程',
      发生日期: '2026-07-29',
    },
  },
  {
    type: 'EXPENSE_CLAIM',
    entity: 'CN01',
    applicant: { staff: ['CN01', 'IT', 2] },
    title: '云服务测试账号费用',
    submittedAt: '2026-10-09T03:15:00Z',
    status: 'PENDING',
    nodesActed: 1,
    formData: {
      报销金额: 899,
      币种: 'CNY',
      费用类别: '其他',
      报销事由: '集成测试所需云服务测试账号',
      发生日期: '2026-10-08',
    },
  },
  {
    type: 'EXPENSE_CLAIM',
    entity: 'SG01',
    applicant: { staff: ['SG01', 'OPS', 2] },
    title: 'Taxi claims: late settlement nights',
    submittedAt: '2026-10-13T09:20:00Z',
    status: 'PENDING',
    nodesActed: 0,
    formData: {
      报销金额: 186.4,
      币种: 'SGD',
      费用类别: '交通费',
      报销事由: '月末清算加班后打车',
      发生日期: '2026-09-30',
    },
  },
  {
    type: 'EXPENSE_CLAIM',
    entity: 'CN01',
    applicant: { staff: ['CN01', 'CB', 1] },
    title: '客户拜访招待',
    submittedAt: '2026-09-03T06:10:00Z',
    status: 'REJECTED',
    nodesActed: 2,
    formData: {
      报销金额: 2150,
      币种: 'CNY',
      费用类别: '业务招待费',
      报销事由: '深圳企业客户拜访晚宴',
      发生日期: '2026-08-28',
    },
    finalComment: '超出招待标准，请补充说明后重新提交',
  },
  {
    type: 'EXPENSE_CLAIM',
    entity: 'SG01',
    applicant: { staff: ['SG01', 'IT', 1] },
    title: 'Conference: cloud security summit',
    submittedAt: '2026-07-20T02:50:00Z',
    status: 'APPROVED',
    nodesActed: 2,
    formData: {
      报销金额: 980,
      币种: 'SGD',
      费用类别: '培训费',
      报销事由: '云安全峰会门票',
      发生日期: '2026-07-16',
    },
  },
  {
    type: 'EXPENSE_CLAIM',
    entity: 'CN01',
    applicant: 'E100005',
    title: '新加坡出差：海外人力资源协同',
    submittedAt: '2026-09-28T01:10:00Z',
    status: 'APPROVED',
    nodesActed: 2,
    formData: {
      报销金额: 7820,
      币种: 'CNY',
      费用类别: '差旅费',
      报销事由: '赴新加坡与当地人力资源团队协同员工数据整合',
      发生日期: '2026-09-21',
    },
  },
  {
    type: 'IT_ASSET_PURCHASE',
    entity: 'SG01',
    applicant: { head: ['SG01', 'IT'] },
    title: 'Laptops for Q4 new hires (3 units)',
    submittedAt: '2026-09-29T02:20:00Z',
    status: 'APPROVED',
    nodesActed: 3,
    formData: {
      资产名称: '笔记本电脑',
      数量: 3,
      预计金额: 6600,
      币种: 'SGD',
      用途: '第四季度新员工入职配置',
    },
  },
  {
    type: 'IT_ASSET_PURCHASE',
    entity: 'CN01',
    applicant: { staff: ['CN01', 'IT', 1] },
    title: '数据平台服务器扩容',
    submittedAt: '2026-10-10T02:40:00Z',
    status: 'PENDING',
    nodesActed: 1,
    formData: {
      资产名称: '服务器',
      数量: 2,
      预计金额: 86000,
      币种: 'CNY',
      用途: '集团数据平台计算资源扩容',
    },
  },
  {
    type: 'IT_ASSET_PURCHASE',
    entity: 'SG01',
    applicant: 'E100007',
    title: 'Monitors for hot desks (10 units)',
    submittedAt: '2026-08-12T03:30:00Z',
    status: 'APPROVED',
    nodesActed: 3,
    formData: {
      资产名称: '显示器',
      数量: 10,
      预计金额: 3200,
      币种: 'SGD',
      用途: '共享工位显示器更换',
    },
  },
  {
    type: 'IT_ASSET_PURCHASE',
    entity: 'CN01',
    applicant: { staff: ['CN01', 'OPS', 1] },
    title: '运营部软件许可续费',
    submittedAt: '2026-09-16T05:00:00Z',
    status: 'REJECTED',
    nodesActed: 3,
    formData: {
      资产名称: '软件许可',
      数量: 15,
      预计金额: 27000,
      币种: 'CNY',
      用途: '运营对账软件年度许可续费',
    },
    finalComment: '请并入年度集中采购',
  },
  {
    type: 'OFFICE_RENTAL',
    entity: 'SG01',
    applicant: { head: ['SG01', 'ADMIN'] },
    title: 'Singapore office lease renewal (Level 18)',
    submittedAt: '2026-08-03T02:00:00Z',
    status: 'APPROVED',
    nodesActed: 3,
    formData: {
      办公地点: '新加坡莱佛士坊 18 楼',
      面积平方米: 1200,
      月租金: 96000,
      币种: 'SGD',
      租期月数: 36,
    },
  },
  {
    type: 'OFFICE_RENTAL',
    entity: 'CN01',
    applicant: { head: ['CN01', 'ADMIN'] },
    title: '深圳分部办公室扩租',
    submittedAt: '2026-10-06T01:50:00Z',
    status: 'PENDING',
    nodesActed: 2,
    formData: { 办公地点: '深圳前海', 面积平方米: 450, 月租金: 135000, 币种: 'CNY', 租期月数: 24 },
  },
  {
    type: 'PAYMENT_APPROVAL',
    entity: 'SG01',
    applicant: { head: ['SG01', 'FIN'] },
    title: 'Recruitment agency fee: Relationship Manager search',
    submittedAt: '2026-10-08T02:35:00Z',
    status: 'PENDING',
    nodesActed: 1,
    formData: {
      收款单位: 'Harbourline Talent Pte. Ltd.',
      付款金额: 18000,
      币种: 'SGD',
      付款事由: '客户经理招聘服务费',
      预计付款日期: '2026-10-30',
    },
  },
  {
    type: 'PAYMENT_APPROVAL',
    entity: 'CN01',
    applicant: { head: ['CN01', 'FIN'] },
    title: '云服务年度费用支付',
    submittedAt: '2026-07-14T02:00:00Z',
    status: 'APPROVED',
    nodesActed: 2,
    formData: {
      收款单位: '华东云联科技有限公司',
      付款金额: 240000,
      币种: 'CNY',
      付款事由: '年度云服务费用',
      预计付款日期: '2026-07-31',
    },
  },
  {
    type: 'PAYMENT_APPROVAL',
    entity: 'SG01',
    applicant: { head: ['SG01', 'FIN'] },
    title: 'Office fit-out final payment',
    submittedAt: '2026-07-27T03:05:00Z',
    status: 'APPROVED',
    nodesActed: 2,
    formData: {
      收款单位: 'Northbridge Interiors Pte. Ltd.',
      付款金额: 42500,
      币种: 'SGD',
      付款事由: '办公室装修尾款',
      预计付款日期: '2026-08-15',
    },
  },
];

class Directory {
  constructor(private readonly employees: readonly SyntheticEmployee[]) {}

  byNo(employeeNo: string): SyntheticEmployee {
    const employee = this.employees.find((e) => e.employeeNo === employeeNo);
    if (!employee) {
      throw new Error(`Unknown employee ${employeeNo}`);
    }
    return employee;
  }

  /** The department head: the person in the department whose manager is the entity's top executive. */
  head(entity: EntityCode, code: DepartmentCode): SyntheticEmployee {
    const top = this.top(entity);
    const head = this.employees.find(
      (e) =>
        e.entityCode === entity &&
        e.departmentCode === code &&
        e.managerEmployeeNo === top.employeeNo,
    );
    return head ?? top;
  }

  top(entity: EntityCode): SyntheticEmployee {
    return this.byNo(entity === 'SG01' ? 'E100002' : 'E100001');
  }

  staff(entity: EntityCode, code: DepartmentCode, index: number): SyntheticEmployee {
    const head = this.head(entity, code);
    const staff = this.employees.filter(
      (e) =>
        e.entityCode === entity &&
        e.departmentCode === code &&
        e.employeeNo !== head.employeeNo &&
        e.employmentStatus === 'ACTIVE',
    );
    const person = staff[index % Math.max(1, staff.length)];
    return person ?? head;
  }

  resolve(ref: ApplicantRef): SyntheticEmployee {
    if (typeof ref === 'string') {
      return this.byNo(ref);
    }
    if ('head' in ref) {
      return this.head(...ref.head);
    }
    return this.staff(...ref.staff);
  }
}

function displayName(employee: SyntheticEmployee): string {
  return employee.entityCode === 'CN01' && employee.nameZh
    ? employee.nameZh
    : employee.fullNameLatin;
}

function approverFor(
  node: string,
  type: ApprovalType,
  applicant: SyntheticEmployee,
  directory: Directory,
): SyntheticEmployee {
  const entity = applicant.entityCode;
  switch (node) {
    case '部门负责人审批': {
      const head = directory.head(entity, applicant.departmentCode);
      return head.employeeNo === applicant.employeeNo ? directory.top(entity) : head;
    }
    case 'HR审核':
      return entity === 'SG01' ? directory.byNo('E100003') : directory.head(entity, 'HR');
    case '总部审批':
      return type === 'MANPOWER_REQUEST' ? directory.byNo('E100005') : directory.byNo('E100001');
    case '财务审核':
      return directory.head(entity, 'FIN');
    case 'IT审核':
      return directory.head(entity, 'IT');
    case '行政审核':
      return directory.head(entity, 'ADMIN');
    default:
      throw new Error(`Unknown approval node ${node}`);
  }
}

/** Generates the OA approval requests, with approval chains resolved against the workforce. */
export function generateApprovals(workforce: Workforce): SyntheticApproval[] {
  const rng = new SeededRandom(SYNTHETIC_SEED).fork('approvals');
  const directory = new Directory(workforce.employees);

  return SPECS.map((spec, index): SyntheticApproval => {
    const applicant = directory.resolve(spec.applicant);
    const nodes = APPROVAL_CHAINS[spec.type];
    const chain: ApprovalStep[] = [
      {
        node: '发起申请',
        approverEmployeeNo: applicant.employeeNo,
        approverName: displayName(applicant),
        action: 'SUBMIT',
        at: spec.submittedAt,
        comment: null,
      },
    ];
    let at = spec.submittedAt;
    let completedAt: string | null = null;
    nodes.forEach((node, nodeIndex) => {
      const approver = approverFor(node, spec.type, applicant, directory);
      const acted = nodeIndex < spec.nodesActed;
      const isLast = nodeIndex === spec.nodesActed - 1;
      const rejected = spec.status === 'REJECTED' && isLast;
      if (spec.status === 'REJECTED' && nodeIndex >= spec.nodesActed) {
        return;
      }
      if (spec.status === 'WITHDRAWN' && nodeIndex >= spec.nodesActed) {
        return;
      }
      if (acted) {
        at = `${addDays(at.slice(0, 10), rng.int(1, 2))}T0${String(rng.int(1, 9))}:${String(rng.int(10, 59))}:00Z`;
      }
      chain.push({
        node,
        approverEmployeeNo: approver.employeeNo,
        approverName: displayName(approver),
        action: acted ? (rejected ? 'REJECT' : 'APPROVE') : 'PENDING',
        at: acted ? at : null,
        comment: rejected ? (spec.finalComment ?? null) : acted ? '同意' : null,
      });
      if (acted && (rejected || nodeIndex === nodes.length - 1)) {
        completedAt = at;
      }
    });
    if (spec.status === 'WITHDRAWN') {
      completedAt = `${addDays(at.slice(0, 10), 1)}T03:00:00Z`;
    }
    return {
      requestId: `OA-2026-${String(101 + index).padStart(6, '0')}`,
      type: spec.type,
      title: spec.title,
      status: spec.status,
      applicantEmployeeNo: applicant.employeeNo,
      entityCode: spec.entity,
      submittedAt: spec.submittedAt,
      completedAt,
      formData: spec.formData,
      chain,
    };
  });
}

/** The display name the OA platform uses for an employee (Chinese name at HQ when there is one). */
export function oaDisplayName(employee: SyntheticEmployee): string {
  return displayName(employee);
}

/**
 * The chain a new request of `type` raised by `applicantEmployeeNo` would follow:
 * the applicant's SUBMIT step at `submittedAt`, then every approval node, still PENDING.
 */
export function planApprovalChain(
  workforce: Workforce,
  type: ApprovalType,
  applicantEmployeeNo: string,
  submittedAt: string,
): ApprovalStep[] {
  const directory = new Directory(workforce.employees);
  const applicant = directory.byNo(applicantEmployeeNo);
  return [
    {
      node: '发起申请',
      approverEmployeeNo: applicant.employeeNo,
      approverName: displayName(applicant),
      action: 'SUBMIT',
      at: submittedAt,
      comment: null,
    },
    ...APPROVAL_CHAINS[type].map((node): ApprovalStep => {
      const approver = approverFor(node, type, applicant, directory);
      return {
        node,
        approverEmployeeNo: approver.employeeNo,
        approverName: displayName(approver),
        action: 'PENDING',
        at: null,
        comment: null,
      };
    }),
  ];
}

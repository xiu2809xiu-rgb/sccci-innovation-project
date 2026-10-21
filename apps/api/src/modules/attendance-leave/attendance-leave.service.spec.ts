import { COMPANY_MONTHLY_TEMPLATE, type EntityCode } from '@huitong/shared';

import { AttendanceLeaveService } from './attendance-leave.service.js';
import type { LeaveCategoryMappingsRepository } from './leave-category-mappings.repository.js';
import { MockConsolidationRepository } from './mock/mock-consolidation.repository.js';
import type { ReportTemplatesRepository } from './report-templates.repository.js';

const SEPTEMBER_RUN = '0199a3b1-0c40-7e21-9f3a-2c4d6e8f0a91';
const meta = { actor: null, ip: null, userAgent: null, traceId: 'trace' };

function serviceWith(template = COMPANY_MONTHLY_TEMPLATE) {
  const templates = {
    active: () => Promise.resolve(template),
  } as unknown as ReportTemplatesRepository;
  const mappings = {} as LeaveCategoryMappingsRepository;
  return new AttendanceLeaveService(new MockConsolidationRepository(), mappings, templates);
}

const viewer = (homeEntityCode: EntityCode) => ({
  id: 'u',
  role: 'HR_SG' as const,
  homeEntityCode,
});

describe('AttendanceLeaveService', () => {
  it("shows a run's exceptions for the caller's entity only, and counts the rest", async () => {
    const service = serviceWith();
    const singapore = await service.run(SEPTEMBER_RUN, viewer('SG01'));
    expect(singapore.exceptions.map((item) => item.employeeNo)).toEqual([
      'E100061',
      'E100069',
      'E100003',
    ]);
    expect(singapore.withheldExceptionCount).toBe(2);

    const hq = await service.run(SEPTEMBER_RUN, viewer('CN01'));
    expect(hq.exceptions.map((item) => item.type)).toEqual(['NO_TEMPLATE_COLUMN', 'LEAVE_PENDING']);
    expect(hq.withheldExceptionCount).toBe(3);
  });

  it("previews the caller's entity's rows in the template, paged", async () => {
    const preview = await serviceWith().preview(
      { period: '2026-09', page: 1, pageSize: 4 },
      viewer('SG01'),
    );
    expect(preview.entityCode).toBe('SG01');
    expect(preview.total).toBe(10);
    expect(preview.rows).toHaveLength(4);
    expect(preview.rows.every((row) => row.values.entity === 'SG01')).toBe(true);
    expect(preview.template.key).toBe(COMPANY_MONTHLY_TEMPLATE.key);
  });

  it('answers NOT_FOUND for an unknown run and a missing template', async () => {
    await expect(serviceWith().run('missing', viewer('SG01'))).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    const templates = {
      active: () => Promise.resolve(null),
    } as unknown as ReportTemplatesRepository;
    const service = new AttendanceLeaveService(
      new MockConsolidationRepository(),
      {} as LeaveCategoryMappingsRepository,
      templates,
    );
    await expect(service.template()).rejects.toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('leaves consolidating, exporting and changing a rule to area 3', async () => {
    const service = serviceWith();
    await expect(
      service.startRun({ period: '2026-10', entityCodes: ['SG01'] }, meta),
    ).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED' });
    await expect(service.exportRun(SEPTEMBER_RUN, meta)).rejects.toMatchObject({
      code: 'NOT_IMPLEMENTED',
    });
    await expect(
      service.changeMapping(
        'rule',
        { canonicalCategory: 'OTHER', templateColumn: null, reason: 'HQ asked for it' },
        meta,
      ),
    ).rejects.toMatchObject({ code: 'NOT_IMPLEMENTED', status: 501 });
  });
});

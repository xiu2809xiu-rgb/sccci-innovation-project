import { Injectable } from '@nestjs/common';
import {
  COMPANY_MONTHLY_TEMPLATE,
  type ChangeLeaveCategoryMapping,
  type ConsolidationRunDetail,
  type ConsolidationRunListQuery,
  type ConsolidationRunSummary,
  type LeaveCategoryMapping,
  type LeaveCategoryMappingListQuery,
  type ReportTemplate,
  type StartConsolidation,
  type TemplatePreview,
  type TemplatePreviewQuery,
} from '@huitong/shared';

import { NotFoundError, NotImplementedError } from '../../common/errors/app-error.js';
import type { AuthenticatedUser } from '../../common/http/authenticated-user.js';
import type { Page } from '../../common/http/page.js';
import type { RequestMeta } from '../../common/http/request-meta.js';
import { ConsolidationRepository } from './consolidation.repository.js';
import { LeaveCategoryMappingsRepository } from './leave-category-mappings.repository.js';
import { ReportTemplatesRepository } from './report-templates.repository.js';

/**
 * Attendance and leave use cases. The reads are complete against the
 * contract; consolidating, exporting and changing a rule are area 3's to build.
 *
 * Per-person data (a run's exceptions, the template's rows) stays within the
 * caller's own entity: no transfer register entry shares attendance or leave
 * between entities, so default deny applies (story B-7). Area 3 and area 4
 * decide whether HQ's report needs such an entry.
 */
@Injectable()
export class AttendanceLeaveService {
  constructor(
    private readonly consolidation: ConsolidationRepository,
    private readonly mappings: LeaveCategoryMappingsRepository,
    private readonly templates: ReportTemplatesRepository,
  ) {}

  runs(query: ConsolidationRunListQuery): Promise<Page<ConsolidationRunSummary>> {
    return this.consolidation.runs(query);
  }

  async run(id: string, viewer: AuthenticatedUser): Promise<ConsolidationRunDetail> {
    const run = await this.consolidation.run(id);
    if (!run) throw new NotFoundError('The consolidation run');
    const visible = run.exceptions.filter((item) => item.entityCode === viewer.homeEntityCode);
    return {
      ...run,
      exceptions: visible,
      withheldExceptionCount: run.exceptions.length - visible.length,
    };
  }

  /** Consolidates a month (stories D-1 to D-3): area 3 queues it on `QUEUES.consolidation`. */
  startRun(_body: StartConsolidation, _meta: RequestMeta): Promise<ConsolidationRunSummary> {
    return Promise.reject(new NotImplementedError('Consolidating a month', 'area 3 (D-1 to D-3)'));
  }

  /** Renders a month into the company template as .xlsx (story D-4), audited, without withheld fields. */
  exportRun(_runId: string, _meta: RequestMeta): Promise<never> {
    return Promise.reject(new NotImplementedError('Exporting the template', 'area 3 (D-4)'));
  }

  mappingRules(query: LeaveCategoryMappingListQuery): Promise<Page<LeaveCategoryMapping>> {
    return this.mappings.list(query);
  }

  /** Proposes a changed rule (story D-2); it applies only once approved, and both steps are audited. */
  changeMapping(
    _mappingId: string,
    _body: ChangeLeaveCategoryMapping,
    _meta: RequestMeta,
  ): Promise<LeaveCategoryMapping> {
    return Promise.reject(
      new NotImplementedError('Changing a leave-category rule', 'area 3 (D-2)'),
    );
  }

  async template(): Promise<ReportTemplate> {
    const template = await this.templates.active(COMPANY_MONTHLY_TEMPLATE.key);
    if (!template) throw new NotFoundError('The company reporting template');
    return template;
  }

  async preview(query: TemplatePreviewQuery, viewer: AuthenticatedUser): Promise<TemplatePreview> {
    const [template, rows] = await Promise.all([
      this.template(),
      this.consolidation.previewRows(query.period),
    ]);
    const visible = rows.filter((row) => row.values.entity === viewer.homeEntityCode);
    const start = (query.page - 1) * query.pageSize;
    return {
      template,
      period: query.period,
      entityCode: viewer.homeEntityCode,
      rows: visible.slice(start, start + query.pageSize),
      total: visible.length,
    };
  }
}

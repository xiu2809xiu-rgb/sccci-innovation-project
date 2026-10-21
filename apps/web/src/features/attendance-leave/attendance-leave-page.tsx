import { useMatch } from 'react-router';

import { CategoryRulesPage } from './pages/category-rules-page';
import { ConsolidationRunsPage } from './pages/consolidation-runs-page';
import { TemplatePreviewPage } from './pages/template-preview-page';

/**
 * Attendance, leave and consolidation (area 3): the runs, the category rules
 * and the template preview. One lazy route module serves all three paths.
 * The rules and the template are real; runs and rows are typed sample data
 * until area 3 builds its engine, and the pages say so.
 */
export function AttendanceLeavePage() {
  const rules = useMatch('/attendance-leave/mappings');
  const template = useMatch('/attendance-leave/template');
  if (rules) return <CategoryRulesPage />;
  if (template) return <TemplatePreviewPage />;
  return <ConsolidationRunsPage />;
}

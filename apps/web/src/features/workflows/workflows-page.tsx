import { useMatch, useParams } from 'react-router';

import { WorkflowBoardPage } from './pages/workflow-board-page';
import { WorkflowInstancePage } from './pages/workflow-instance-page';
import { WorkflowTasksPage } from './pages/workflow-tasks-page';

/**
 * Workflow automation (area 2): the pipeline board, one instance, and the
 * task list. One lazy route module serves all three paths, so they share one
 * chunk. Until area 2 builds its engine, the API serves typed sample data and
 * every page says so.
 */
export function WorkflowsPage() {
  const tasks = useMatch('/workflows/tasks');
  const { instanceId } = useParams();
  if (tasks) return <WorkflowTasksPage />;
  if (instanceId) return <WorkflowInstancePage instanceId={instanceId} />;
  return <WorkflowBoardPage />;
}

import type { AccessPolicyService } from '../access/access-policy.service.js';
import { MockWorkflowsRepository } from './mock/mock-workflows.repository.js';
import { WorkflowsService } from './workflows.service.js';

function serviceFor(canManage: boolean) {
  const repository = new MockWorkflowsRepository();
  const tasks = vi.spyOn(repository, 'tasks');
  const access = { hasPermission: () => canManage } as unknown as AccessPolicyService;
  return { service: new WorkflowsService(repository, access), tasks };
}

const query = { page: 1, pageSize: 25, state: 'open' } as const;
const meta = { actor: null, ip: null, userAgent: null, traceId: 'trace' };

describe('WorkflowsService', () => {
  it("lists the caller's role's tasks for scope=mine", async () => {
    const { service, tasks } = serviceFor(false);
    await service.tasks(
      { ...query, scope: 'mine' },
      { id: 'u', role: 'ADMIN_OPS', homeEntityCode: 'SG01' },
    );
    expect(tasks).toHaveBeenCalledWith({ ...query, assigneeRole: 'ADMIN_OPS' });
  });

  it('lists every task for scope=all only to roles that manage workflows', async () => {
    const viewer = { id: 'u', role: 'HR_SG', homeEntityCode: 'SG01' } as const;
    const manager = serviceFor(true);
    await manager.service.tasks({ ...query, scope: 'all' }, viewer);
    expect(manager.tasks).toHaveBeenCalledWith(query);

    const other = serviceFor(false);
    expect(() =>
      other.service.tasks({ ...query, scope: 'all' }, { ...viewer, role: 'HIRING_MANAGER' }),
    ).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));
  });

  it('answers NOT_FOUND for an unknown instance', async () => {
    await expect(serviceFor(true).service.instance('missing')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
    });
  });

  it('does not complete tasks until area 2 builds the state machine', async () => {
    await expect(serviceFor(true).service.completeTask('task', {}, meta)).rejects.toMatchObject({
      code: 'NOT_IMPLEMENTED',
      status: 501,
    });
  });
});

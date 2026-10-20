import type { PrismaService } from '../../src/infrastructure/prisma/prisma.service.js';

/**
 * Empties the employee master and its sync history, so a test file starts from
 * the seed. Audit events are append-only and stay.
 */
export async function resetEmployeeMaster(prisma: PrismaService): Promise<void> {
  await prisma.$transaction([
    prisma.employeeChange.deleteMany(),
    prisma.fieldProvenance.deleteMany(),
    prisma.conflict.deleteMany(),
    prisma.sourceRecord.deleteMany(),
    prisma.employee.deleteMany(),
    prisma.syncError.deleteMany(),
    prisma.syncRun.deleteMany(),
  ]);
}

/**
 * Removes mapping proposals and everything approving them created: the
 * mapping versions they produced and the draft file connectors. The seeded
 * baseline mappings stay.
 */
export async function resetMappingProposals(prisma: PrismaService): Promise<void> {
  await prisma.$transaction([
    prisma.mappingConfig.deleteMany({
      where: { OR: [{ proposalId: { not: null } }, { connectorId: { startsWith: 'file-' } }] },
    }),
    prisma.mappingProposal.deleteMany(),
    prisma.connector.deleteMany({ where: { id: { startsWith: 'file-' } } }),
  ]);
}

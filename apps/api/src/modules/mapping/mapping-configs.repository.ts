import { Injectable } from '@nestjs/common';
import { mappingSetSchema, type FieldMapping } from '@huitong/shared';

import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

export interface ActiveMapping {
  id: string;
  version: number;
  mappings: FieldMapping[];
}

/** Versioned field mappings. Reads re-validate the stored JSON, so a corrupted mapping fails loudly. */
@Injectable()
export class MappingConfigsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActive(connectorId: string): Promise<ActiveMapping | null> {
    const config = await this.prisma.mappingConfig.findFirst({
      where: { connectorId, status: 'ACTIVE' },
      orderBy: { version: 'desc' },
    });
    return config
      ? {
          id: config.id,
          version: config.version,
          mappings: mappingSetSchema.parse(config.mappings),
        }
      : null;
  }

  async findById(id: string): Promise<ActiveMapping | null> {
    const config = await this.prisma.mappingConfig.findUnique({ where: { id } });
    return config
      ? {
          id: config.id,
          version: config.version,
          mappings: mappingSetSchema.parse(config.mappings),
        }
      : null;
  }

  listForConnector(connectorId: string) {
    return this.prisma.mappingConfig.findMany({
      where: { connectorId },
      orderBy: { version: 'desc' },
    });
  }

  async activeVersions(connectorIds: readonly string[]): Promise<Map<string, number>> {
    const configs = await this.prisma.mappingConfig.findMany({
      where: { connectorId: { in: [...connectorIds] }, status: 'ACTIVE' },
      select: { connectorId: true, version: true },
    });
    return new Map(configs.map((config) => [config.connectorId, config.version]));
  }
}

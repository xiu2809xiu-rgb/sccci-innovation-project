import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module.js';
import { MappingConfigsRepository } from './mapping-configs.repository.js';
import { MappingEngine } from './mapping-engine.js';
import { MappingProposalsController } from './proposals/mapping-proposals.controller.js';
import { MappingProposalsRepository } from './proposals/mapping-proposals.repository.js';
import { MappingProposalsService } from './proposals/mapping-proposals.service.js';
import { SampleFileReader } from './proposals/sample-file-reader.js';
import { TransformerRegistry } from './transformers/transformer-registry.js';

/** The mapping engine (Strategy transformers), versioned mapping configs and the AI mapping wizard. */
@Module({
  imports: [AiModule],
  controllers: [MappingProposalsController],
  providers: [
    TransformerRegistry,
    MappingEngine,
    MappingConfigsRepository,
    MappingProposalsRepository,
    MappingProposalsService,
    SampleFileReader,
  ],
  exports: [MappingEngine, MappingConfigsRepository],
})
export class MappingModule {}

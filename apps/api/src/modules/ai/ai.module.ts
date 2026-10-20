import { Module } from '@nestjs/common';

import { DiscrepancyExplainer } from './discrepancy/discrepancy-explainer.js';
import { SchemaMappingAssistant } from './schema-mapping/schema-mapping.assistant.js';

/** AI features (area 1): the schema-mapping assistant and the discrepancy explainer, both behind LlmGateway. */
@Module({
  providers: [SchemaMappingAssistant, DiscrepancyExplainer],
  exports: [SchemaMappingAssistant, DiscrepancyExplainer],
})
export class AiModule {}

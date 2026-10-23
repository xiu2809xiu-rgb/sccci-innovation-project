import {
  connectorDetailSchema,
  dataEnvelopeSchema,
  mappingProposalSchema,
  suggestedMappings,
  syncRunDetailSchema,
  syncRunSchema,
  type ConnectorDetail,
  type EntityCode,
  type FieldMapping,
  type MappingProposal,
  type StartSyncRequest,
  type SyncRunDetail,
} from '@huitong/shared';

import { CSRF_HEADER, type TestClient } from './test-app.js';

const proposalEnvelope = dataEnvelopeSchema(mappingProposalSchema);
const connectorEnvelope = dataEnvelopeSchema(connectorDetailSchema);
const runEnvelope = dataEnvelopeSchema(syncRunSchema);
const runDetailEnvelope = dataEnvelopeSchema(syncRunDetailSchema);
const TERMINAL = new Set(['SUCCEEDED', 'PARTIAL', 'FAILED']);

export interface NewFileConnector {
  name: string;
  nameZh: string;
  entityCode: EntityCode;
}

/**
 * The wizard's path to a file connector: upload a sample, then approve the
 * proposal as a new draft connector, with the AI's suggestions or with
 * mappings a reviewer wrote. Returns the new connector's id.
 */
export async function approveFileConnector(
  client: TestClient,
  sample: { content: Buffer; name: string },
  connector: NewFileConnector,
  mappings?: (proposal: MappingProposal) => FieldMapping[],
): Promise<string> {
  const proposed = await client.agent
    .post('/api/v1/mapping-proposals')
    .set(CSRF_HEADER, client.csrf)
    .field('sourceSystemName', connector.name)
    .field('entityCode', connector.entityCode)
    .field('language', 'en')
    .attach('file', sample.content, sample.name)
    .expect(201);
  const proposal = proposalEnvelope.parse(proposed.body).data;
  const approved = await client.agent
    .post(`/api/v1/mapping-proposals/${proposal.id}/approve`)
    .set(CSRF_HEADER, client.csrf)
    .send({
      mappings: mappings
        ? mappings(proposal)
        : suggestedMappings(proposal.columns, proposal.fixedValues),
      connector: { kind: 'new', ...connector },
    })
    .expect(200);
  const id = proposalEnvelope.parse(approved.body).data.mappingConfig?.connectorId;
  if (!id) throw new Error('approving the proposal created no connector');
  return id;
}

/** Approves the AI's mapping of `sample` as the next version of an existing file connector. */
export async function approveNextVersion(
  client: TestClient,
  connectorId: string,
  sample: { content: Buffer; name: string },
): Promise<number> {
  const proposed = await client.agent
    .post('/api/v1/mapping-proposals')
    .set(CSRF_HEADER, client.csrf)
    .field('sourceSystemName', 'Next version')
    .field('connectorId', connectorId)
    .field('language', 'en')
    .attach('file', sample.content, sample.name)
    .expect(201);
  const proposal = proposalEnvelope.parse(proposed.body).data;
  const approved = await client.agent
    .post(`/api/v1/mapping-proposals/${proposal.id}/approve`)
    .set(CSRF_HEADER, client.csrf)
    .send({
      mappings: suggestedMappings(proposal.columns, proposal.fixedValues),
      connector: { kind: 'existing', connectorId },
    })
    .expect(200);
  const version = proposalEnvelope.parse(approved.body).data.mappingConfig?.version;
  if (!version) throw new Error('approving the proposal saved no mapping version');
  return version;
}

export function stageFile(
  client: TestClient,
  connectorId: string,
  file: { content: Buffer; name: string },
) {
  return client.agent
    .post(`/api/v1/connectors/${connectorId}/import-file`)
    .set(CSRF_HEADER, client.csrf)
    .attach('file', file.content, file.name);
}

export function startSync(
  client: TestClient,
  connectorId: string,
  body: Partial<StartSyncRequest>,
) {
  return client.agent
    .post(`/api/v1/connectors/${connectorId}/sync`)
    .set(CSRF_HEADER, client.csrf)
    .send(body);
}

/** Waits for a sync run to finish, polling gently: every request counts against the rate limit. */
export async function finishedRun(client: TestClient, id: string): Promise<SyncRunDetail> {
  const deadline = Date.now() + 25_000;
  for (;;) {
    const response = await client.agent.get(`/api/v1/sync-runs/${id}`).expect(200);
    const run = runDetailEnvelope.parse(response.body).data;
    if (TERMINAL.has(run.status)) return run;
    if (Date.now() > deadline) throw new Error(`Sync run ${id} is still ${run.status}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

export async function syncAndWait(
  client: TestClient,
  connectorId: string,
  body: Partial<StartSyncRequest>,
): Promise<SyncRunDetail> {
  const response = await startSync(client, connectorId, body).expect(202);
  return finishedRun(client, runEnvelope.parse(response.body).data.id);
}

export async function connectorDetail(
  client: TestClient,
  connectorId: string,
): Promise<ConnectorDetail> {
  const response = await client.agent.get(`/api/v1/connectors/${connectorId}`).expect(200);
  return connectorEnvelope.parse(response.body).data;
}

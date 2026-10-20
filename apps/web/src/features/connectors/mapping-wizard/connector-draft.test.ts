import { describe, expect, it } from 'vitest';

import { connectorFromDraft, type ConnectorDraft } from './connector-draft';

const draft = (overrides: Partial<ConnectorDraft>): ConnectorDraft => ({
  target: 'new',
  existingId: '',
  name: 'Organisation E Malaysia HR',
  nameZh: '马来西亚人力资源系统',
  entity: 'MY01',
  ...overrides,
});

describe('connectorFromDraft', () => {
  it('describes a new connector once it has both names and an entity', () => {
    expect(connectorFromDraft(draft({ name: ' Organisation E Malaysia HR ' }))).toEqual({
      kind: 'new',
      name: 'Organisation E Malaysia HR',
      nameZh: '马来西亚人力资源系统',
      entityCode: 'MY01',
    });
    expect(connectorFromDraft(draft({ nameZh: ' ' }))).toBeNull();
    expect(connectorFromDraft(draft({ name: 'M' }))).toBeNull();
    expect(connectorFromDraft(draft({ entity: '' }))).toBeNull();
  });

  it('names an existing connector only once one is chosen', () => {
    expect(connectorFromDraft(draft({ target: 'existing' }))).toBeNull();
    expect(connectorFromDraft(draft({ target: 'existing', existingId: 'excel-master' }))).toEqual({
      kind: 'existing',
      connectorId: 'excel-master',
    });
  });
});

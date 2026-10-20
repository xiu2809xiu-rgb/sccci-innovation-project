import type { ApproveProposalRequest, EntityCode, MappingProposal } from '@huitong/shared';

/** HR's answer to "which connector is this mapping for?", as the approve step edits it. */
export interface ConnectorDraft {
  target: 'new' | 'existing';
  existingId: string;
  name: string;
  nameZh: string;
  entity: EntityCode | '';
}

/** Starts from what the proposal says: its connector, or a new one named after the system. */
export function connectorDraftFor(proposal: MappingProposal): ConnectorDraft {
  return {
    target: proposal.connectorId ? 'existing' : 'new',
    existingId: proposal.connectorId ?? '',
    name: proposal.sourceSystemName,
    nameZh: '',
    entity: proposal.entityCode ?? '',
  };
}

/** The connector for the approval request, or null while the draft is incomplete. */
export function connectorFromDraft(
  draft: ConnectorDraft,
): ApproveProposalRequest['connector'] | null {
  if (draft.target === 'existing') {
    return draft.existingId ? { kind: 'existing', connectorId: draft.existingId } : null;
  }
  const name = draft.name.trim();
  const nameZh = draft.nameZh.trim();
  return name.length >= 2 && nameZh !== '' && draft.entity !== ''
    ? { kind: 'new', name, nameZh, entityCode: draft.entity }
    : null;
}

import { UpstreamUnavailableError } from '../../common/errors/app-error.js';
import type { AiUsageTracker, UsageEntry } from './ai-usage.tracker.js';
import { LlmGateway } from './llm.gateway.js';
import type { LlmProvider, LlmRequest } from './llm.types.js';
import { MockLlmProvider } from './providers/mock-llm.provider.js';
import { estimateTokens } from './token-estimate.js';

const request: LlmRequest = {
  feature: 'schema-mapping',
  system: 'Map columns to the canonical employee model.',
  prompt: 'Headers: 员工编号, 姓名, 入职日期',
  maxOutputTokens: 500,
  userId: 'user-1',
  requestId: 'req-1',
};

function fakeTracker() {
  const entries: UsageEntry[] = [];
  const tracker = {
    record: vi.fn((entry: UsageEntry) =>
      Promise.resolve((entries.push(entry), `usage-${String(entries.length)}`)),
    ),
  };
  return { tracker: tracker as unknown as AiUsageTracker, entries };
}

describe('LlmGateway', () => {
  it('returns the completion and records a successful call with its token counts', async () => {
    const mock = new MockLlmProvider();
    mock.register('schema-mapping', () => '{"mappings":[]}');
    const { tracker, entries } = fakeTracker();
    const result = await new LlmGateway(mock, tracker).complete(request);
    expect(result).toMatchObject({
      text: '{"mappings":[]}',
      provider: 'MOCK',
      usageRecordId: 'usage-1',
    });
    expect(entries[0]).toMatchObject({
      feature: 'schema-mapping',
      outcome: 'SUCCESS',
      userId: 'user-1',
      requestId: 'req-1',
    });
    expect(entries[0]?.inputTokens).toBeGreaterThan(0);
  });

  it('records failed calls too and reports them as an upstream error', async () => {
    const failing: LlmProvider = {
      name: 'BEDROCK',
      model: 'test-model',
      complete: () => Promise.reject(new TypeError('network down')),
    };
    const { tracker, entries } = fakeTracker();
    await expect(new LlmGateway(failing, tracker).complete(request)).rejects.toBeInstanceOf(
      UpstreamUnavailableError,
    );
    expect(entries[0]).toMatchObject({
      outcome: 'ERROR',
      provider: 'BEDROCK',
      model: 'test-model',
      errorCode: 'TypeError',
      inputTokens: 0,
    });
  });
});

describe('MockLlmProvider', () => {
  it('is deterministic and falls back to a placeholder when no responder is registered', async () => {
    const mock = new MockLlmProvider();
    const a = await mock.complete(request);
    const b = await mock.complete(request);
    expect(a).toEqual(b);
    expect(a.text).toContain('No mock responder registered');
  });
});

describe('estimateTokens', () => {
  it('counts CJK characters individually and Latin text in four-character chunks', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('员工编号')).toBe(4);
    expect(estimateTokens('姓名 Name')).toBe(2 + 2);
  });
});

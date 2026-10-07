import { afterEach, describe, expect, it, vi } from 'vitest';
import { bedrockApiOf, readAiConfig, supportsEffort } from './config';
import { danglingToolResults } from './protocol';
import { inputSchemaOf } from './tools/define';
import { READ_TOOLS } from './tools/read';
import { WRITE_TOOLS } from './tools/write';

describe('readAiConfig', () => {
  afterEach(() => vi.unstubAllEnvs());

  const clear = () => {
    for (const k of [
      'HEEDAY_AI_ENABLED',
      'HEEDAY_BEDROCK_API_KEY',
      'HEEDAY_AWS_ACCESS_KEY_ID',
      'HEEDAY_AWS_SECRET_ACCESS_KEY',
      'HEEDAY_AWS_REGION',
      'HEEDAY_AI_MODEL',
    ])
      vi.stubEnv(k, '');
  };

  it('is unconfigured without keys, ignoring Lambda-style AWS_* vars', () => {
    clear();
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'lambda-role');
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'lambda-secret');
    expect(readAiConfig().status.state).toBe('unconfigured');
  });

  it('prefers the Bedrock API key and applies defaults', () => {
    clear();
    vi.stubEnv('HEEDAY_BEDROCK_API_KEY', 'k');
    vi.stubEnv('HEEDAY_AWS_ACCESS_KEY_ID', 'a');
    vi.stubEnv('HEEDAY_AWS_SECRET_ACCESS_KEY', 's');
    const { status, config } = readAiConfig();
    expect(status).toEqual({
      state: 'ready',
      model: 'global.anthropic.claude-sonnet-5-5',
      region: 'us-east-1',
      auth: 'apiKey',
    });
    expect(config?.auth.kind).toBe('apiKey');
    expect(config?.api).toBe('invoke');
  });

  it('uses IAM keys only as a pair', () => {
    clear();
    vi.stubEnv('HEEDAY_AWS_ACCESS_KEY_ID', 'a');
    expect(readAiConfig().status).toMatchObject({ state: 'unconfigured', missing: ['HEEDAY_AWS_SECRET_ACCESS_KEY'] });
    vi.stubEnv('HEEDAY_AWS_SECRET_ACCESS_KEY', 's');
    expect(readAiConfig().status).toMatchObject({ state: 'ready', auth: 'iam' });
  });

  it('routes models to the right Bedrock endpoint', () => {
    expect(bedrockApiOf('global.anthropic.claude-haiku-4-5-20251001-v1:0')).toBe('invoke');
    expect(bedrockApiOf('us.anthropic.claude-haiku-4-5-20251001-v1:0')).toBe('invoke');
    expect(bedrockApiOf('anthropic.claude-haiku-4-5-20251001-v1:0')).toBe('invoke');
    expect(bedrockApiOf('anthropic.claude-opus-5-5')).toBe('mantle');
  });

  it('sends effort only to models that accept it', () => {
    expect(supportsEffort('global.anthropic.claude-sonnet-5-5')).toBe(true);
    expect(supportsEffort('anthropic.claude-opus-5-5')).toBe(true);
    expect(supportsEffort('us.anthropic.claude-sonnet-4-6')).toBe(true);
    expect(supportsEffort('global.anthropic.claude-haiku-4-5-20251001-v1:0')).toBe(false);
    expect(supportsEffort('us.anthropic.claude-sonnet-4-5-20250929-v1:0')).toBe(false);
  });

  it('can be switched off', () => {
    clear();
    vi.stubEnv('HEEDAY_BEDROCK_API_KEY', 'k');
    vi.stubEnv('HEEDAY_AI_ENABLED', '0');
    expect(readAiConfig().status.state).toBe('disabled');
  });
});

describe('tool definitions', () => {
  const tools = [...READ_TOOLS, ...WRITE_TOOLS];

  it('have unique names and object input schemas', () => {
    expect(new Set(tools.map((t) => t.name)).size).toBe(tools.length);
    for (const t of tools) {
      const schema = inputSchemaOf(t);
      expect(schema.type, t.name).toBe('object');
      expect(schema).not.toHaveProperty('$schema');
    }
  });

  it('leave defaulted fields optional for the model', () => {
    const search = READ_TOOLS.find((t) => t.name === 'search_tasks')!;
    expect(inputSchemaOf(search).required ?? []).not.toContain('limit');
  });
});

describe('danglingToolResults', () => {
  it('closes tool_use blocks left without results', () => {
    const out = danglingToolResults([
      { role: 'user', content: 'q' },
      { role: 'assistant', content: [{ type: 'text', text: '조회합니다' }, { type: 'tool_use', id: 'tu_1', name: 'x', input: {} }] },
    ]);
    expect(out).toEqual([{ type: 'tool_result', tool_use_id: 'tu_1', content: '중단되어 실행하지 않았습니다.', is_error: true }]);
  });

  it('returns null for a finished turn', () => {
    expect(danglingToolResults([{ role: 'assistant', content: [{ type: 'text', text: '끝' }] }])).toBeNull();
    expect(danglingToolResults([])).toBeNull();
  });
});

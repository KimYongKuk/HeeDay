/**
 * AI 도우미 settings, read from server env only.
 *
 * The names carry a HEEDAY_ prefix on purpose: Netlify functions run on AWS Lambda, which sets its
 * own AWS_REGION / AWS_ACCESS_KEY_ID for the function's role. Reading those would silently send
 * requests with the wrong account, so the client never falls back to the default AWS chain.
 */

export type AiAuthKind = 'apiKey' | 'iam';

/**
 * Which Bedrock endpoint serves the model:
 * - 'invoke': bedrock-runtime InvokeModel, ARN-versioned IDs and inference profiles
 *   (`global.anthropic.claude-haiku-4-5-20251001-v1:0`). Haiku 4.5 and other older models live here.
 * - 'mantle': the Messages-API endpoint for newer models with bare IDs (`anthropic.claude-opus-5-5`).
 */
export type BedrockApi = 'invoke' | 'mantle';

export interface AiConfig {
  region: string;
  model: string;
  api: BedrockApi;
  fallbackModel: string | null;
  auth:
    | { kind: 'apiKey'; apiKey: string }
    | { kind: 'iam'; accessKeyId: string; secretAccessKey: string; sessionToken: string | null };
}

export type AiStatus =
  | { state: 'ready'; model: string; region: string; auth: AiAuthKind }
  | { state: 'disabled' }
  | { state: 'unconfigured'; missing: string[] };

/**
 * Claude Sonnet 5.5 through the global inference profile (InvokeModel). Verified 2026-10-07: on this
 * account the bare Mantle ID `anthropic.claude-sonnet-5-5` returns 404 and the bare InvokeModel ID
 * needs an inference profile, so the `global.` profile is the one that works.
 */
export const DEFAULT_AI_MODEL = 'global.anthropic.claude-sonnet-5-5';

/** Inference-profile prefix or an ARN-style version suffix means the InvokeModel endpoint. */
export function bedrockApiOf(model: string): BedrockApi {
  return /^(global|us|eu|jp|apac)\./.test(model) || /-v\d+(:\d+)?$/.test(model) || model.startsWith('arn:')
    ? 'invoke'
    : 'mantle';
}

/** `output_config.effort` exists from Opus/Sonnet 4.6 on; Haiku 4.5 and older reject it. */
export function supportsEffort(model: string): boolean {
  const m = /claude-(?:opus|sonnet|fable|mythos)-(\d+)(?:-(\d+))?/.exec(model);
  if (!m) return false;
  const major = Number(m[1]);
  // `claude-sonnet-4-20250514`: the second number is a date, not a minor version.
  const minor = m[2] && m[2].length <= 2 ? Number(m[2]) : 0;
  return major > 4 || (major === 4 && minor >= 6);
}

export const DEFAULT_AI_REGION = 'us-east-1';

function env(name: string): string | null {
  const v = process.env[name]?.trim();
  return v ? v : null;
}

export function readAiConfig(): { status: AiStatus; config: AiConfig | null } {
  if (env('HEEDAY_AI_ENABLED') === '0') return { status: { state: 'disabled' }, config: null };

  const region = env('HEEDAY_AWS_REGION') ?? DEFAULT_AI_REGION;
  const model = env('HEEDAY_AI_MODEL') ?? DEFAULT_AI_MODEL;
  const fallbackModel = env('HEEDAY_AI_FALLBACK_MODEL');

  const apiKey = env('HEEDAY_BEDROCK_API_KEY');
  const accessKeyId = env('HEEDAY_AWS_ACCESS_KEY_ID');
  const secretAccessKey = env('HEEDAY_AWS_SECRET_ACCESS_KEY');

  let auth: AiConfig['auth'] | null = null;
  if (apiKey) auth = { kind: 'apiKey', apiKey };
  else if (accessKeyId && secretAccessKey)
    auth = { kind: 'iam', accessKeyId, secretAccessKey, sessionToken: env('HEEDAY_AWS_SESSION_TOKEN') };

  if (!auth) {
    return {
      status: {
        state: 'unconfigured',
        missing: accessKeyId
          ? ['HEEDAY_AWS_SECRET_ACCESS_KEY']
          : ['HEEDAY_AWS_ACCESS_KEY_ID/HEEDAY_AWS_SECRET_ACCESS_KEY (또는 HEEDAY_BEDROCK_API_KEY)'],
      },
      config: null,
    };
  }
  return {
    status: { state: 'ready', model, region, auth: auth.kind },
    config: { region, model, api: bedrockApiOf(model), fallbackModel, auth },
  };
}

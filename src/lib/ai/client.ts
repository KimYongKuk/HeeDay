import { AnthropicBedrock, AnthropicBedrockMantle } from '@anthropic-ai/bedrock-sdk';
import { betaRefusalFallbackMiddleware, type Anthropic } from '@anthropic-ai/sdk';
import type { AiConfig } from './config';

/** The only surface the assistant loop uses; both Bedrock clients provide it. */
export interface BedrockMessages {
  messages: Pick<Anthropic['messages'], 'stream'>;
}

let cached: { key: string; client: BedrockMessages } | null = null;

/** One client per config; rebuilt only when env changes (dev reloads). */
export function getBedrockClient(config: AiConfig): BedrockMessages {
  const key = JSON.stringify(config);
  if (cached?.key === key) return cached.client;

  const middleware = config.fallbackModel
    ? [betaRefusalFallbackMiddleware([{ model: config.fallbackModel }])]
    : undefined;
  const common = { awsRegion: config.region, maxRetries: 2, timeout: 60_000, middleware };
  const { auth } = config;

  // Credentials are always passed explicitly so the SDK never reads Lambda's own AWS_* variables.
  let client: BedrockMessages;
  if (config.api === 'invoke') {
    client =
      auth.kind === 'apiKey'
        ? new AnthropicBedrock({ ...common, apiKey: auth.apiKey })
        : new AnthropicBedrock({
            ...common,
            awsAccessKey: auth.accessKeyId,
            awsSecretKey: auth.secretAccessKey,
            awsSessionToken: auth.sessionToken,
          });
  } else {
    client =
      auth.kind === 'apiKey'
        ? new AnthropicBedrockMantle({ ...common, apiKey: auth.apiKey })
        : new AnthropicBedrockMantle({
            ...common,
            awsAccessKey: auth.accessKeyId,
            awsSecretAccessKey: auth.secretAccessKey,
            awsSessionToken: auth.sessionToken,
          });
  }
  cached = { key, client };
  return client;
}

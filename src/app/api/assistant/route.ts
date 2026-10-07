import { z } from 'zod';
import { ApiError, ok, parseBody, route } from '@/lib/api/handler';
import { runAssistant } from '@/lib/ai/assistant';
import { readAiConfig } from '@/lib/ai/config';
import { ASSISTANT_LIMITS, type AssistantEvent, type AssistantRequest } from '@/lib/ai/protocol';
import { getDb } from '@/lib/db/client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BODY = 2_000_000;

const requestSchema = z.object({
  transcript: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.unknown() }))
    .max(ASSISTANT_LIMITS.transcript + 10),
  text: z.string().max(ASSISTANT_LIMITS.text).optional(),
  resume: z
    .object({
      pending: z
        .array(
          z.object({
            type: z.literal('tool_result'),
            tool_use_id: z.string().min(1).max(200),
            content: z.string(),
            is_error: z.boolean().optional(),
          }),
        )
        .max(20),
      outcomes: z
        .array(
          z.object({
            toolUseId: z.string().min(1).max(200),
            result: z.enum(['applied', 'cancelled', 'failed', 'skipped']),
            detail: z.string().max(300).optional(),
          }),
        )
        .max(20),
    })
    .optional(),
});

/** Whether the widget can be used: configuration only, never calls Bedrock. */
export const GET = route(async () => ok(readAiConfig().status));

/** Streams newline-delimited JSON `AssistantEvent`s. */
export const POST = route(async (req) => {
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY) {
    throw new ApiError(413, 'TOO_LARGE', '대화가 너무 깁니다. 새 대화를 시작합니다.');
  }
  const body = (await parseBody(req, requestSchema)) as AssistantRequest;
  const db = getDb();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: AssistantEvent) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
        } catch {
          // client went away; the abort signal stops the loop
        }
      };
      await runAssistant(db, body, emit, req.signal);
      try {
        controller.close();
      } catch {
        // already closed by a disconnect
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  });
});

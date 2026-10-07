/**
 * The AI 도우미 loop: stream a model turn, run read tools, repeat. A write tool stops the loop and
 * hands its proposal to the widget; the next request resumes with the user's decision.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { Db } from '@/lib/db/client';
import { todayInSeoul } from '@/lib/utils/dates';
import { getBedrockClient } from './client';
import { readAiConfig, supportsEffort } from './config';
import { SYSTEM_PROMPT } from './prompt';
import {
  ASSISTANT_LIMITS,
  type AssistantEvent,
  type AssistantRequest,
  type PendingToolResult,
  type TranscriptMessage,
  type WriteOutcome,
  type WriteProposal,
} from './protocol';
import { inputSchemaOf, ToolInputError, type AnyTool, type ToolContext } from './tools/define';
import { READ_TOOLS, withWeekday } from './tools/read';
import { WRITE_TOOLS } from './tools/write';

const TOOLS: AnyTool[] = [...READ_TOOLS, ...WRITE_TOOLS];
const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));
/** Built once: a stable tool list keeps the cached prompt prefix valid. */
const TOOL_DEFS: Anthropic.Tool[] = TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: inputSchemaOf(t) as Anthropic.Tool.InputSchema,
}));

const RESULT_LIMIT = 40_000;
const MAX_TOKENS = 8_000;

const OUTCOME_TEXT: Record<WriteOutcome['result'], string> = {
  applied: '사용자가 확인하여 적용되었습니다.',
  cancelled: '사용자가 취소했습니다. 적용되지 않았습니다.',
  failed: '적용에 실패했습니다.',
  skipped: '사용자가 확인하지 않고 다음 질문으로 넘어갔습니다. 적용되지 않았습니다.',
};

function outcomeBlock(o: WriteOutcome): Anthropic.ToolResultBlockParam {
  return {
    type: 'tool_result',
    tool_use_id: o.toolUseId,
    content: o.detail ? `${OUTCOME_TEXT[o.result]} ${o.detail}` : OUTCOME_TEXT[o.result],
    ...(o.result === 'failed' ? { is_error: true } : {}),
  };
}

function resultText(value: unknown): string {
  const text = JSON.stringify(value);
  return text.length > RESULT_LIMIT ? `${text.slice(0, RESULT_LIMIT)}\n(결과가 길어 잘렸습니다. 조건을 좁혀 다시 조회합니다.)` : text;
}

function errorResult(id: string, message: string): PendingToolResult {
  return { type: 'tool_result', tool_use_id: id, content: message, is_error: true };
}

function describeApiError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError)
    return 'AWS 키 또는 Bedrock 모델 권한을 확인해야 합니다.';
  if (err instanceof Anthropic.NotFoundError) return '모델 ID 또는 리전 설정을 확인해야 합니다.';
  if (err instanceof Anthropic.RateLimitError) return '요청이 많습니다. 잠시 후 다시 시도합니다.';
  if (err instanceof Anthropic.BadRequestError) return '요청을 처리할 수 없습니다. 새 대화로 다시 시도합니다.';
  if (err instanceof Anthropic.APIConnectionError) return 'AI 서버에 연결하지 못했습니다.';
  return 'AI 응답 중 오류가 발생했습니다.';
}

/** The new user turn: resolved tool results first, then the typed text with today's date. */
function buildUserMessage(req: AssistantRequest, today: string): Anthropic.MessageParam | null {
  const content: Anthropic.ContentBlockParam[] = [];
  if (req.resume) {
    content.push(...(req.resume.pending as Anthropic.ToolResultBlockParam[]));
    content.push(...req.resume.outcomes.map(outcomeBlock));
  }
  const text = req.text?.trim();
  if (text) content.push({ type: 'text', text: `[오늘: ${withWeekday(today)}]\n${text}` });
  return content.length > 0 ? { role: 'user', content } : null;
}

async function runTool(
  ctx: ToolContext,
  block: Anthropic.ToolUseBlock,
  emit: (e: AssistantEvent) => void,
): Promise<{ result: PendingToolResult } | { proposal: WriteProposal }> {
  const tool = TOOL_BY_NAME.get(block.name);
  if (!tool) return { result: errorResult(block.id, `알 수 없는 도구입니다: ${block.name}`) };
  const parsed = tool.input.safeParse(block.input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.') || '(입력)'}: ${i.message}`).join('; ');
    return { result: errorResult(block.id, `입력값 오류: ${issues}`) };
  }
  try {
    if (tool.kind === 'write') return { proposal: await tool.propose(ctx, parsed.data, block.id) };
    emit({ type: 'status', label: tool.label });
    const value = await tool.run(ctx, parsed.data);
    return { result: { type: 'tool_result', tool_use_id: block.id, content: resultText(value) } };
  } catch (err) {
    if (err instanceof ToolInputError) return { result: errorResult(block.id, err.message) };
    console.error(`assistant tool ${block.name} failed`, err);
    return { result: errorResult(block.id, '조회 중 서버 오류가 발생했습니다.') };
  }
}

export async function runAssistant(
  db: Db,
  req: AssistantRequest,
  emit: (e: AssistantEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const { status, config } = readAiConfig();
  if (!config) {
    emit({
      type: 'error',
      message: status.state === 'disabled' ? 'AI 도우미가 꺼져 있습니다.' : 'AI 도우미 키가 설정되지 않았습니다.',
    });
    return;
  }
  if (req.transcript.length >= ASSISTANT_LIMITS.transcript) {
    emit({ type: 'error', message: '대화가 길어졌습니다. 새 대화를 시작합니다.' });
    return;
  }

  const today = todayInSeoul();
  const userMessage = buildUserMessage(req, today);
  if (!userMessage) {
    emit({ type: 'error', message: '질문을 입력합니다.' });
    return;
  }
  emit({ type: 'append', message: userMessage as TranscriptMessage });
  const messages = [...(req.transcript as Anthropic.MessageParam[]), userMessage];

  const client = getBedrockClient(config);
  const ctx: ToolContext = { db, today };

  try {
    for (let round = 0; round < ASSISTANT_LIMITS.rounds; round += 1) {
      // After tool results the model reads them before writing; say so instead of a stale tool label.
      if (round > 0) emit({ type: 'status', label: '조회 결과 정리 중' });
      const stream = client.messages.stream(
        {
          model: config.model,
          max_tokens: MAX_TOKENS,
          system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          tools: TOOL_DEFS,
          // Chat answers do well at low effort; Haiku 4.5 and older models reject the field.
          ...(supportsEffort(config.model) ? { output_config: { effort: 'low' as const } } : {}),
          messages,
        },
        { signal },
      );
      stream.on('text', (delta) => emit({ type: 'text', delta }));
      const final = await stream.finalMessage();

      const assistant: Anthropic.MessageParam = { role: 'assistant', content: final.content };
      messages.push(assistant);
      emit({ type: 'append', message: assistant as TranscriptMessage });

      if (final.stop_reason === 'refusal') {
        emit({ type: 'text', delta: '\n\n이 요청은 처리할 수 없습니다. 질문을 바꿔 다시 요청합니다.' });
        break;
      }
      const toolUses = final.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
      if (toolUses.length === 0) {
        if (final.stop_reason === 'max_tokens') emit({ type: 'text', delta: '\n\n(답변이 길어 중간에 끊겼습니다.)' });
        break;
      }

      // A truncated tool input may still parse; never act on it.
      const outcomes =
        final.stop_reason === 'max_tokens'
          ? toolUses.map((b) => ({ result: errorResult(b.id, '응답이 잘려 실행하지 않았습니다. 더 짧게 다시 요청합니다.') }))
          : await Promise.all(toolUses.map((b) => runTool(ctx, b, emit)));

      const results = outcomes.flatMap((o) => ('result' in o ? [o.result] : []));
      const proposals = outcomes.flatMap((o) => ('proposal' in o ? [o.proposal] : []));
      if (proposals.length > 0) {
        // Results for this turn go back together once the user decides (see buildUserMessage).
        emit({ type: 'proposals', proposals, pending: results });
        break;
      }

      const toolMessage: Anthropic.MessageParam = { role: 'user', content: results as Anthropic.ToolResultBlockParam[] };
      messages.push(toolMessage);
      emit({ type: 'append', message: toolMessage as TranscriptMessage });

      if (round === ASSISTANT_LIMITS.rounds - 1) {
        emit({ type: 'text', delta: '\n\n조회가 많아 여기서 멈춥니다. 질문을 나눠서 다시 요청합니다.' });
      }
    }
    emit({ type: 'done' });
  } catch (err) {
    if (signal.aborted) return;
    console.error('assistant request failed', err);
    emit({ type: 'error', message: describeApiError(err) });
  }
}

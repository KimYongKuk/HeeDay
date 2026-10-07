/**
 * Wire format between the AI 도우미 widget and `/api/assistant`. Shared by client and server, so it
 * imports no provider SDK: API messages travel as opaque JSON that the client stores and sends
 * back unchanged (the conversation is append-only; editing earlier turns invalidates them).
 */
import type { ColorKey, TaskStatus } from '@/lib/domain/enums';
import type { DateWarning, ISODate } from '@/lib/domain/types';

/** One provider message (`{ role, content }`) exactly as the server produced it. */
export type TranscriptMessage = { role: 'user' | 'assistant'; content: unknown };

/** A tool result block the server already computed while a write proposal waits for the user. */
export type PendingToolResult = { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

export type WriteOutcome = {
  toolUseId: string;
  result: 'applied' | 'cancelled' | 'failed' | 'skipped';
  detail?: string;
};

export type AssistantRequest = {
  transcript: TranscriptMessage[];
  /** Typed question; may be empty when only resolving proposals. */
  text?: string;
  /** Present when the previous turn paused on write proposals. */
  resume?: { pending: PendingToolResult[]; outcomes: WriteOutcome[] };
};

export interface TaskRef {
  id: number;
  title: string;
  dueDate: ISODate;
  status: TaskStatus;
  programId: number;
  programName: string;
  programColor: ColorKey;
}

export type WriteProposal =
  | {
      kind: 'add_task';
      toolUseId: string;
      program: { id: number; name: string; color: ColorKey };
      title: string;
      dueDate: ISODate;
      checklist: string[];
      notes: string | null;
      warning: DateWarning | null;
    }
  | { kind: 'set_task_status'; toolUseId: string; status: TaskStatus; tasks: TaskRef[] }
  | { kind: 'move_task'; toolUseId: string; task: TaskRef; toDate: ISODate; warning: DateWarning | null }
  | { kind: 'append_task_note'; toolUseId: string; task: TaskRef; text: string };

export type AssistantEvent =
  /** Store this message at the end of the transcript. */
  | { type: 'append'; message: TranscriptMessage }
  | { type: 'text'; delta: string }
  /**
   * Progress line (a read tool started, or the model is reading results). Text streamed before it
   * belongs to an earlier step, so the widget closes that segment here.
   */
  | { type: 'status'; label: string }
  | { type: 'proposals'; proposals: WriteProposal[]; pending: PendingToolResult[] }
  | { type: 'done' }
  | { type: 'error'; message: string };

/**
 * A request cut off mid-turn can leave an assistant `tool_use` without its results, which the
 * provider rejects. Returns the results that close it (as interrupted), or null when nothing dangles.
 */
export function danglingToolResults(transcript: TranscriptMessage[]): PendingToolResult[] | null {
  const last = transcript.at(-1);
  if (!last || last.role !== 'assistant' || !Array.isArray(last.content)) return null;
  const ids = (last.content as { type?: string; id?: string }[])
    .filter((b) => b.type === 'tool_use' && typeof b.id === 'string')
    .map((b) => b.id as string);
  if (ids.length === 0) return null;
  return ids.map((id) => ({ type: 'tool_result', tool_use_id: id, content: '중단되어 실행하지 않았습니다.', is_error: true }));
}

export const ASSISTANT_LIMITS = {
  /** characters per typed question */
  text: 2000,
  /** messages kept in one conversation before 새 대화 is required */
  transcript: 80,
  /** model round trips per request */
  rounds: 8,
} as const;

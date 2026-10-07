import { z } from 'zod';
import type { Db } from '@/lib/db/client';
import type { ISODate } from '@/lib/domain/types';
import { isoDateSchema } from '@/lib/domain/zod';
import type { WriteProposal } from '../protocol';

export interface ToolContext {
  db: Db;
  today: ISODate;
}

/** Thrown for bad or unresolvable input; becomes an `is_error` tool result the model can fix. */
export class ToolInputError extends Error {}

interface ToolBase<S extends z.ZodType> {
  name: string;
  description: string;
  input: S;
}

/** Runs immediately; the result goes straight back to the model. */
export interface ReadTool<S extends z.ZodType = z.ZodType> extends ToolBase<S> {
  kind: 'read';
  /** Status line shown in the widget while the tool runs. */
  label: string;
  run(ctx: ToolContext, input: z.output<S>): Promise<unknown>;
}

/** Never writes: builds a proposal the user applies or cancels in the widget. */
export interface WriteTool<S extends z.ZodType = z.ZodType> extends ToolBase<S> {
  kind: 'write';
  propose(ctx: ToolContext, input: z.output<S>, toolUseId: string): Promise<WriteProposal>;
}

export type AnyTool = ReadTool | WriteTool;

export const readTool = <S extends z.ZodType>(t: Omit<ReadTool<S>, 'kind'>): ReadTool =>
  ({ kind: 'read', ...t }) as unknown as ReadTool;

export const writeTool = <S extends z.ZodType>(t: Omit<WriteTool<S>, 'kind'>): WriteTool =>
  ({ kind: 'write', ...t }) as unknown as WriteTool;

/** JSON Schema for the provider `input_schema`, describing what the model may send. */
export function inputSchemaOf(tool: AnyTool): Record<string, unknown> {
  const schema = z.toJSONSchema(tool.input, { io: 'input' }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

export const dateInput = isoDateSchema.describe('YYYY-MM-DD');

export function assertRange(from: ISODate, to: ISODate, maxDays = 400) {
  if (from > to) throw new ToolInputError('from이 to보다 늦습니다.');
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  if (days > maxDays) throw new ToolInputError(`조회 기간은 ${maxDays}일 이내로 지정합니다.`);
}

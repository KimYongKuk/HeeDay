/**
 * AI seam. Not implemented in the MVP.
 *
 * Planned provider: AWS Bedrock (Claude) via `@anthropic-ai/bedrock-sdk`, credentials from
 * server-side env vars only. Planned features:
 *  1. 프로그램 설명 → 양식 초안 (structured output matching TemplateItemSnapshot[])
 *  2. 자연어 → 일정 등록 입력 ("웰다잉 6월 매주 화요일 5회")
 *  3. 완료된 할 일·회차 → 결과보고서 초안
 *
 * Keep every prompt, schema and client here so the rest of the app never imports a provider SDK.
 */
import type { TemplateItemSnapshot } from '@/lib/domain/types';

export interface TemplateDraftRequest {
  programName: string;
  description: string;
}

export interface TemplateDraftResult {
  items: Omit<TemplateItemSnapshot, 'id' | 'actionItemId'>[];
}

export interface AiProvider {
  draftTemplate(input: TemplateDraftRequest): Promise<TemplateDraftResult>;
}

export function getAiProvider(): AiProvider | null {
  return null;
}

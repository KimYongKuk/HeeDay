/**
 * AI seam: AWS Bedrock (Claude) via `@anthropic-ai/bedrock-sdk`, credentials from server env only
 * (see `config.ts`). Keep every prompt, schema and client in this folder so the rest of the app
 * never imports a provider SDK.
 *
 * Implemented: AI 도우미 (`assistant.ts`, `/api/assistant`, widget in `components/assistant`).
 * Read tools query the DB directly; write tools only propose, and the widget applies them through
 * the regular REST API after the user confirms.
 *
 * Candidates for later: 프로그램 설명 → 양식 초안, 자연어 → 일정 등록 입력, 결과보고서 초안.
 */
export { readAiConfig, type AiStatus } from './config';

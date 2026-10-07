'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowUp, Check, Copy, Loader2, MessageCircle, RotateCcw, Square, X } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { LogoMark } from '@/components/shell/Logo';
import { api } from '@/lib/api/client';
import type { AiStatus } from '@/lib/ai/config';
import { ASSISTANT_LIMITS } from '@/lib/ai/protocol';
import { cn } from '@/lib/utils';
import { useAssistantStore, type ChatItem } from '@/stores/assistantStore';
import { Markdown } from './Markdown';
import { ProposalCard } from './ProposalCard';
import { useAssistant } from './useAssistant';

const SUGGESTIONS = [
  '오늘 할 일 정리해줘',
  '이번 주 아직 끝나지 않은 필수 항목은?',
  '일정별 진행률 알려줘',
  '휴관일이나 주말에 잡힌 할 일 있어?',
];

export function AssistantWidget() {
  const open = useAssistantStore((s) => s.open);
  const setOpen = useAssistantStore((s) => s.setOpen);

  return (
    <div className="print:hidden">
      {open ? (
        <AssistantPanel onClose={() => setOpen(false)} />
      ) : (
        <button
          type="button"
          aria-label="AI 도우미 열기"
          title="AI 도우미"
          onClick={() => setOpen(true)}
          className="bg-brand hover:bg-brand-deep fixed right-4 bottom-[72px] z-40 flex size-12 items-center justify-center rounded-full text-white shadow-lg transition-colors md:right-6 md:bottom-6"
        >
          <MessageCircle className="size-[22px]" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

function AssistantPanel({ onClose }: { onClose: () => void }) {
  const items = useAssistantStore((s) => s.items);
  const busy = useAssistantStore((s) => s.busy);
  const awaiting = useAssistantStore((s) => s.awaiting);
  const transcriptLength = useAssistantStore((s) => s.transcript.length);
  const { send, decide, undo, stop, reset } = useAssistant();
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  /** Follow new output only while the reader is at the bottom; scrolling up to reread stops it. */
  const stickRef = useRef(true);

  const status = useQuery({
    queryKey: ['assistant-status'],
    queryFn: () => api<AiStatus>('/api/assistant'),
    staleTime: 60_000,
  });
  const ready = status.data?.state === 'ready';
  const full = transcriptLength >= ASSISTANT_LIMITS.transcript;

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [items]);

  // Keep the cursor in the input on desktop; on phones focusing would pop the keyboard over the answer.
  useEffect(() => {
    if (!busy && ready && window.matchMedia('(min-width: 768px)').matches) inputRef.current?.focus();
  }, [busy, ready]);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (text = draft) => {
    if (!text.trim() || busy || !ready || full) return;
    stickRef.current = true;
    send(text);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Korean IME: Enter that confirms a syllable must not send.
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <section
      aria-label="AI 도우미"
      className="bg-surface border-line fixed inset-0 z-50 flex flex-col md:inset-auto md:right-6 md:bottom-6 md:h-[min(640px,calc(100dvh-96px))] md:w-[400px] md:rounded-2xl md:border md:shadow-2xl"
    >
      <header className="border-line flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <LogoMark className="size-6" />
        <h2 className="text-[14px] font-semibold">히데이 도우미</h2>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            title="새 대화"
            aria-label="새 대화"
            disabled={items.length === 0}
            onClick={() => {
              reset();
              setDraft('');
            }}
            className="text-ink-muted hover:bg-app hover:text-ink flex size-8 items-center justify-center rounded-lg disabled:opacity-40"
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            type="button"
            title="닫기"
            aria-label="닫기"
            onClick={onClose}
            className="text-ink-muted hover:bg-app hover:text-ink flex size-8 items-center justify-center rounded-lg"
          >
            <X className="size-[18px]" />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {items.length === 0 ? (
          <Intro ready={ready} status={status.data} loading={status.isLoading} onPick={(q) => submit(q)} />
        ) : (
          items.map((it) => (
            <Item
              key={it.id}
              item={it}
              onDecide={(action) => void decide(it.id, action)}
              onUndo={() => undo(it.id)}
            />
          ))
        )}
        {full ? (
          <p className="text-ink-faint text-center text-[12px]">대화가 길어졌습니다. 새 대화를 시작합니다.</p>
        ) : null}
      </div>

      <footer className="border-line shrink-0 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {awaiting ? (
          <p className="text-ink-faint mb-2 text-[11.5px]">확인 카드에서 적용 또는 취소를 선택합니다.</p>
        ) : null}
        <div className="border-line focus-within:border-brand-line flex items-end gap-2 rounded-xl border px-3 py-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={ASSISTANT_LIMITS.text}
            disabled={!ready || full}
            placeholder={ready ? '일정, 할 일, 메모에 대해 물어봅니다' : 'AI 도우미를 사용할 수 없습니다'}
            className="placeholder:text-ink-ghost field-sizing-content max-h-32 min-h-6 flex-1 resize-none bg-transparent text-[13.5px] leading-6 outline-none disabled:cursor-not-allowed"
          />
          {busy ? (
            <button
              type="button"
              aria-label="중단"
              title="중단"
              onClick={stop}
              className="bg-ink flex size-7 shrink-0 items-center justify-center rounded-full text-white"
            >
              <Square className="size-3" fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="보내기"
              title="보내기"
              disabled={!draft.trim() || !ready || full}
              onClick={() => submit()}
              className="bg-brand disabled:bg-ink-ghost flex size-7 shrink-0 items-center justify-center rounded-full text-white"
            >
              <ArrowUp className="size-4" strokeWidth={2.4} />
            </button>
          )}
        </div>
        <p className="text-ink-faint mt-1.5 text-center text-[10.5px]">
          AI 답변은 틀릴 수 있습니다. 변경은 확인 후 적용됩니다.
        </p>
      </footer>
    </section>
  );
}

function Intro({
  ready,
  status,
  loading,
  onPick,
}: {
  ready: boolean;
  status: AiStatus | undefined;
  loading: boolean;
  onPick: (q: string) => void;
}) {
  if (loading) {
    return (
      <div className="text-ink-faint flex justify-center py-10">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="bg-app text-ink-muted rounded-xl p-4 text-[12.5px] leading-relaxed">
        <p className="text-ink font-semibold">AI 도우미가 설정되지 않았습니다.</p>
        <p className="mt-1">
          {status?.state === 'disabled'
            ? 'HEEDAY_AI_ENABLED=0으로 꺼져 있습니다.'
            : 'AWS Bedrock 키를 환경 변수에 입력하면 사용할 수 있습니다. 설정 화면에서 상태를 확인합니다.'}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-4 pt-2">
      <div className="text-[13px] leading-relaxed">
        <p className="font-semibold">히데이 데이터를 조회하고 정리합니다.</p>
        <p className="text-ink-muted mt-1">
          일정, 할 일, 체크리스트, 메모, 양식, 휴관일을 찾아보고 집계합니다. 할 일 추가, 상태와 날짜 변경, 메모 추가도
          요청할 수 있으며 변경은 확인 후 적용됩니다.
        </p>
      </div>
      <div className="flex flex-col items-start gap-2">
        {SUGGESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            className="border-line hover:border-brand-line hover:bg-brand-soft rounded-full border px-3 py-1.5 text-left text-[12.5px] transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Korean text wraps at word boundaries (keep-all); long tokens such as URLs may still break. */
const KO_WRAP = 'break-keep [overflow-wrap:anywhere]';

function Item({
  item,
  onDecide,
  onUndo,
}: {
  item: ChatItem;
  onDecide: (action: 'apply' | 'cancel') => void;
  onUndo: () => Promise<void>;
}) {
  if (item.role === 'user') {
    return (
      <div className="flex justify-end">
        <p
          className={cn(
            'bg-brand-soft text-ink max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-[13.5px] leading-relaxed whitespace-pre-wrap',
            KO_WRAP,
          )}
        >
          {item.text}
        </p>
      </div>
    );
  }
  if (item.role === 'proposal') return <ProposalCard item={item} onDecide={onDecide} onUndo={onUndo} />;
  return <AssistantMessage item={item} />;
}

function AssistantMessage({ item }: { item: Extract<ChatItem, { role: 'assistant' }> }) {
  // Items saved before steps/done existed rehydrate without them.
  const steps = item.steps ?? [];
  const done = item.done ?? true;
  const answer = item.text.trim();
  if (!answer && steps.length === 0 && !item.status && !item.error) return null;

  const copy = () =>
    navigator.clipboard.writeText(answer).then(
      () => toast.success('답변을 복사했습니다.'),
      () => toast.error('복사하지 못했습니다.'),
    );

  return (
    <div className={cn('group text-ink text-[13.5px] leading-[1.7]', KO_WRAP)}>
      {steps.length > 0 ? (
        <ul className="text-ink-faint mb-2 space-y-0.5 text-[12px] leading-snug">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-1.5">
              <Check className="mt-px size-3.5 shrink-0" />
              <span className="line-clamp-2">{step}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {answer ? <Markdown text={answer} /> : null}
      {item.status ? (
        <p className={cn('text-ink-faint flex items-center gap-1.5 text-[12px]', answer && 'mt-2')}>
          <Loader2 className="size-3.5 animate-spin" />
          {item.status}
        </p>
      ) : null}
      {item.error ? (
        <p className="bg-danger-soft text-sun mt-2 rounded-lg px-3 py-2 text-[12.5px]">{item.error}</p>
      ) : null}
      {done && answer && !item.error ? (
        <div className="mt-1 flex opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
          <button
            type="button"
            onClick={copy}
            title="답변 복사"
            aria-label="답변 복사"
            className="text-ink-faint hover:bg-app hover:text-ink -ml-1 flex size-7 items-center justify-center rounded-md"
          >
            <Copy className="size-3.5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

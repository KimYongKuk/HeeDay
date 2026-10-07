'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  danglingToolResults,
  type AssistantEvent,
  type AssistantRequest,
} from '@/lib/ai/protocol';
import { awaitingProposals, outcomeOf, useAssistantStore, type ChatItem } from '@/stores/assistantStore';
import { applyProposal, proposalSummary, undoProposal } from './applyProposal';

let controller: AbortController | null = null;

const uid = () => crypto.randomUUID();
const store = () => useAssistantStore.getState();

function patchAssistant(id: string, fn: (it: Extract<ChatItem, { role: 'assistant' }>) => Partial<ChatItem>) {
  const it = store().items.find((x) => x.id === id);
  if (it?.role === 'assistant') store().patchItem(id, fn(it));
}

function handleEvent(id: string, e: AssistantEvent) {
  const s = store();
  switch (e.type) {
    case 'append':
      s.appendTranscript(e.message);
      break;
    case 'text':
      patchAssistant(id, (it) => ({ text: it.text + e.delta, status: null }));
      break;
    case 'status':
      patchAssistant(id, (it) => {
        const prior = it.text.trim();
        return prior
          ? { steps: [...(it.steps ?? []), prior], text: '', status: e.label }
          : { status: e.label };
      });
      break;
    case 'proposals':
      for (const proposal of e.proposals)
        s.pushItem({ id: uid(), role: 'proposal', proposal, state: 'pending', detail: null, undo: null });
      s.setAwaiting({ pending: e.pending, toolUseIds: e.proposals.map((p) => p.toolUseId) });
      break;
    case 'error':
      patchAssistant(id, () => ({ error: e.message, status: null }));
      break;
    case 'done':
      break;
  }
}

async function run(body: Omit<AssistantRequest, 'transcript'>) {
  const s = store();
  s.setBusy(true);
  const id = uid();
  s.pushItem({ id, role: 'assistant', text: '', steps: [], status: '생각하는 중', error: null, done: false });
  controller = new AbortController();
  try {
    const res = await fetch('/api/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, transcript: store().transcript }),
      signal: controller.signal,
    });
    if (!res.ok || !res.body) {
      const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new Error(data?.error?.message ?? `요청 실패 (${res.status})`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line) handleEvent(id, JSON.parse(line) as AssistantEvent);
      }
    }
  } catch (err) {
    if (controller?.signal.aborted) patchAssistant(id, (it) => ({ text: it.text ? `${it.text}\n\n(중단됨)` : '(중단됨)' }));
    else patchAssistant(id, () => ({ error: err instanceof Error ? err.message : '요청에 실패했습니다.' }));
  } finally {
    patchAssistant(id, () => ({ status: null, done: true }));
    controller = null;
    store().setBusy(false);
    continueIfDecided();
  }
}

/** Once every proposal of the paused turn is decided, report the outcomes so the model can respond. */
function continueIfDecided() {
  const s = store();
  if (!s.awaiting || s.busy) return;
  const props = awaitingProposals(s.items, s.awaiting.toolUseIds);
  if (props.some((p) => p.state === 'pending' || p.state === 'applying')) return;
  const resume = { pending: s.awaiting.pending, outcomes: props.map(outcomeOf) };
  s.setAwaiting(null);
  void run({ resume });
}

export function useAssistant() {
  const qc = useQueryClient();

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['programs'] });
  }, [qc]);

  const send = useCallback((raw: string) => {
    const s = store();
    const text = raw.trim();
    if (!text || s.busy) return;
    s.pushItem({ id: uid(), role: 'user', text });

    let resume: AssistantRequest['resume'];
    if (s.awaiting) {
      // A new question while cards wait: undecided ones are reported as skipped (not applied).
      for (const p of awaitingProposals(s.items, s.awaiting.toolUseIds))
        if (p.state === 'pending') s.patchItem(p.id, { state: 'skipped' });
      const decided = awaitingProposals(store().items, s.awaiting.toolUseIds);
      resume = { pending: s.awaiting.pending, outcomes: decided.map(outcomeOf) };
      s.setAwaiting(null);
    } else {
      const dangling = danglingToolResults(s.transcript);
      if (dangling) resume = { pending: dangling, outcomes: [] };
    }
    const notices = s.takeNotices();
    void run({ text: notices.length > 0 ? `(참고: ${notices.join(' ')})\n${text}` : text, resume });
  }, []);

  const decide = useCallback(
    async (itemId: string, action: 'apply' | 'cancel') => {
      const it = store().items.find((x) => x.id === itemId);
      if (it?.role !== 'proposal' || it.state !== 'pending') return;
      if (action === 'cancel') {
        store().patchItem(itemId, { state: 'cancelled' });
      } else {
        store().patchItem(itemId, { state: 'applying' });
        try {
          const { detail, undo } = await applyProposal(it.proposal);
          store().patchItem(itemId, { state: 'applied', detail, undo });
        } catch (err) {
          store().patchItem(itemId, { state: 'failed', detail: err instanceof Error ? err.message : '적용 실패' });
        }
        refresh();
      }
      continueIfDecided();
    },
    [refresh],
  );

  const undo = useCallback(
    async (itemId: string) => {
      const it = store().items.find((x) => x.id === itemId);
      if (it?.role !== 'proposal' || it.state !== 'applied' || !it.undo) return;
      store().patchItem(itemId, { state: 'applying' });
      try {
        await undoProposal(it.undo);
        store().patchItem(itemId, { state: 'undone' });
        store().addNotice(`직전 변경(${proposalSummary(it.proposal)})은 사용자가 되돌렸습니다.`);
      } catch (err) {
        store().patchItem(itemId, { state: 'applied' });
        throw err;
      } finally {
        refresh();
      }
    },
    [refresh],
  );

  const stop = useCallback(() => controller?.abort(), []);

  const reset = useCallback(() => {
    controller?.abort();
    store().reset();
  }, []);

  return { send, decide, undo, stop, reset };
}

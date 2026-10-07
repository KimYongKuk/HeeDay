'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { PendingToolResult, TranscriptMessage, WriteOutcome, WriteProposal } from '@/lib/ai/protocol';

export type ProposalState = 'pending' | 'applying' | 'applied' | 'cancelled' | 'failed' | 'skipped' | 'undone';

/** What 되돌리기 needs to restore after a proposal was applied. */
export type UndoInfo =
  | { kind: 'delete_task'; taskId: number }
  | { kind: 'patch_tasks'; patches: { id: number; patch: Record<string, unknown> }[] };

export type ChatItem =
  | { id: string; role: 'user'; text: string }
  | {
      id: string;
      role: 'assistant';
      /** Segment being streamed now; becomes the answer when the turn ends. */
      text: string;
      /** Earlier segments written before a tool call ("…을 조회합니다"), shown muted as steps. */
      steps: string[];
      status: string | null;
      error: string | null;
      /** False while the response is still streaming. */
      done: boolean;
    }
  | {
      id: string;
      role: 'proposal';
      proposal: WriteProposal;
      state: ProposalState;
      detail: string | null;
      undo: UndoInfo | null;
    };

interface AssistantState {
  open: boolean;
  /** Desktop only: panel grows to the top-right corner of the window. */
  expanded: boolean;
  busy: boolean;
  /** Provider messages, append-only, sent back with every request. */
  transcript: TranscriptMessage[];
  items: ChatItem[];
  /** Set while a turn waits for proposal decisions. */
  awaiting: { pending: PendingToolResult[]; toolUseIds: string[] } | null;
  /** Context the model has not seen yet (e.g. a change was undone); sent with the next question. */
  notices: string[];

  setOpen: (open: boolean) => void;
  setExpanded: (expanded: boolean) => void;
  setBusy: (busy: boolean) => void;
  appendTranscript: (m: TranscriptMessage) => void;
  pushItem: (item: ChatItem) => void;
  patchItem: (id: string, patch: Partial<ChatItem>) => void;
  setAwaiting: (a: AssistantState['awaiting']) => void;
  addNotice: (n: string) => void;
  takeNotices: () => string[];
  reset: () => void;
}

const empty = { transcript: [], items: [], awaiting: null, notices: [] };

export const useAssistantStore = create<AssistantState>()(
  persist(
    (set, get) => ({
      open: false,
      expanded: false,
      busy: false,
      ...empty,
      setOpen: (open) => set({ open }),
      setExpanded: (expanded) => set({ expanded }),
      setBusy: (busy) => set({ busy }),
      appendTranscript: (m) => set((s) => ({ transcript: [...s.transcript, m] })),
      pushItem: (item) => set((s) => ({ items: [...s.items, item] })),
      patchItem: (id, patch) =>
        set((s) => ({ items: s.items.map((it) => (it.id === id ? ({ ...it, ...patch } as ChatItem) : it)) })),
      setAwaiting: (awaiting) => set({ awaiting }),
      addNotice: (n) => set((s) => ({ notices: [...s.notices, n] })),
      takeNotices: () => {
        const n = get().notices;
        if (n.length > 0) set({ notices: [] });
        return n;
      },
      reset: () => set({ ...empty, busy: false }),
    }),
    {
      // Session only: a closed tab ends the conversation. `open` and `busy` are not restored.
      name: 'heeday.assistant.v1',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({
        transcript: s.transcript,
        items: s.items,
        awaiting: s.awaiting,
        notices: s.notices,
        expanded: s.expanded,
      }),
    },
  ),
);

/** Proposals of the paused turn, decided or not. */
export function awaitingProposals(items: ChatItem[], toolUseIds: string[]) {
  return items.filter(
    (it): it is Extract<ChatItem, { role: 'proposal' }> =>
      it.role === 'proposal' && toolUseIds.includes(it.proposal.toolUseId),
  );
}

export function outcomeOf(it: Extract<ChatItem, { role: 'proposal' }>): WriteOutcome {
  const result =
    it.state === 'applied' || it.state === 'undone'
      ? 'applied'
      : it.state === 'failed'
        ? 'failed'
        : it.state === 'cancelled'
          ? 'cancelled'
          : 'skipped';
  return { toolUseId: it.proposal.toolUseId, result, ...(it.detail ? { detail: it.detail } : {}) };
}
